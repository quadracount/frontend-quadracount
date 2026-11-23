import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { Amount } from "../components/Amount";
import { Avatar, AvatarStack } from "../components/Avatar";
import { BalanceBars } from "../components/BalanceBars";
import { MembersDialog } from "../components/MembersDialog";
import { StatBand, StatCard } from "../components/StatBand";
import { useApp } from "../data/appContext";
import { formatDayMonth, formatMonthName, isSameMonth } from "../lib/dates";
import { balanceTone, formatAmount, formatSigned } from "../lib/money";
import { describeUnevenShares } from "../lib/split";
import type { Expense, Transfer } from "../lib/types";

type ExpenseFilter = "ALL" | "MINE";

export function GroupPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { getGroup, currentUser, now, registerPayment } = useApp();

  const [filter, setFilter] = useState<ExpenseFilter>("ALL");
  const [showMembers, setShowMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balancesRef = useRef<HTMLElement>(null);

  const group = getGroup(groupId);

  // Atajo "N" para registrar un gasto, como indica el badge del botón.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate(`/grupos/${groupId}/nuevo-gasto`);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, groupId]);

  const monthly = useMemo(() => {
    if (!group || !currentUser) return { total: 0, count: 0, mine: 0 };

    const ofMonth = group.expenses.filter((expense) =>
      isSameMonth(expense.createdAt, now),
    );
    const total = ofMonth.reduce((sum, expense) => sum + expense.amount, 0);
    const mine = ofMonth.reduce((sum, expense) => {
      const share = expense.shares.find(
        (candidate) => candidate.userId === currentUser.id,
      );
      return sum + (share?.amount ?? 0);
    }, 0);

    return { total, count: ofMonth.length, mine };
  }, [group, currentUser, now]);

  if (!group || !currentUser) {
    return (
      <div className="qc-section">
        <h1 className="qc-page-title">Grupo no encontrado</h1>
        <p className="qc-muted">
          Puede que ya no seas miembro. <Link to="/">Volver a Inicio</Link>
        </p>
      </div>
    );
  }

  const visibleExpenses =
    filter === "MINE"
      ? group.expenses.filter((expense) => expense.paidBy.userId === currentUser.id)
      : group.expenses;

  /** Cuántas personas le deben al usuario según el plan para saldar. */
  const peopleOwingMe = group.settlementPlan.filter(
    (transfer) => transfer.to.userId === currentUser.id,
  ).length;

  const sharePercent =
    monthly.total > 0 ? Math.round((monthly.mine / monthly.total) * 100) : 0;

  const myShareOf = (expense: Expense) =>
    expense.shares.find((share) => share.userId === currentUser.id)?.amount ?? 0;

  const transferLabel = (transfer: Transfer) => {
    const from = transfer.from.userId === currentUser.id ? "tú" : transfer.from.name;
    const to = transfer.to.userId === currentUser.id ? "tú" : transfer.to.name;
    return `${from} → ${to}`;
  };

  const pay = (transfer: Transfer) => {
    const result = registerPayment(
      group.id,
      transfer.from.userId,
      transfer.to.userId,
      transfer.amount,
    );
    setError(result.ok ? null : result.message);
  };

  return (
    <>
      <header className="qc-page-header">
        <div>
          <p className="qc-eyebrow">Grupo · {group.members.length} miembros</p>
          <h1 className="qc-page-title">{group.name}</h1>
        </div>
        <div className="qc-page-header__actions">
          <AvatarStack members={group.members} />
          <button
            type="button"
            className="qc-btn"
            onClick={() => setShowMembers(true)}
          >
            Miembros
          </button>
          <Link
            to={`/grupos/${group.id}/nuevo-gasto`}
            className="qc-btn qc-btn--primary"
          >
            Nuevo gasto <kbd className="qc-kbd">N</kbd>
          </Link>
        </div>
      </header>

      <StatBand>
        <StatCard
          label="Tu saldo"
          value={formatSigned(group.myBalance)}
          tone={balanceTone(group.myBalance)}
          hint={
            group.myBalance > 0
              ? `Te deben ${peopleOwingMe} ${peopleOwingMe === 1 ? "persona" : "personas"}`
              : group.myBalance < 0
                ? "Tienes un pago pendiente"
                : "Estás al día"
          }
        />
        <StatCard
          label={`Gastos de ${formatMonthName(now).toLowerCase()}`}
          value={formatAmount(monthly.total)}
          hint={`${monthly.count} ${monthly.count === 1 ? "gasto registrado" : "gastos registrados"}`}
        />
        <StatCard
          label="Tu parte del mes"
          value={formatAmount(monthly.mine)}
          hint={`${sharePercent}% del total del grupo`}
        />
      </StatBand>

      {error && <p className="qc-notice qc-notice--error qc-section">{error}</p>}

      <div className="qc-group-grid">
        <div className="qc-group-grid__main">
          <section className="qc-section">
            <div className="qc-section__header">
              <h2 className="qc-section-title">Gastos</h2>
              <div className="qc-tabs qc-tabs--pill" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === "ALL"}
                  className={`qc-tab ${filter === "ALL" ? "qc-tab--active" : ""}`}
                  onClick={() => setFilter("ALL")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === "MINE"}
                  className={`qc-tab ${filter === "MINE" ? "qc-tab--active" : ""}`}
                  onClick={() => setFilter("MINE")}
                >
                  Pagados por mí
                </button>
              </div>
            </div>

            <div className="qc-card qc-section__card">
              {visibleExpenses.length === 0 ? (
                <p className="qc-muted qc-empty">
                  {filter === "MINE"
                    ? "Todavía no has pagado ningún gasto en este grupo."
                    : "Todavía no hay gastos. Registra el primero."}
                </p>
              ) : (
                <table className="qc-table qc-table--expenses">
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Descripción</th>
                      <th scope="col">Pagó</th>
                      <th scope="col" className="qc-num">
                        Total
                      </th>
                      <th scope="col" className="qc-num">
                        Tu parte
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleExpenses.map((expense) => {
                      const uneven = describeUnevenShares(expense);
                      return (
                        <tr key={expense.id}>
                          <td className="qc-mono qc-muted qc-nowrap">
                            {formatDayMonth(expense.createdAt)}
                          </td>
                          <td>
                            <span className="qc-expense__description">
                              {expense.description}
                            </span>
                            {expense.source === "ASSISTANT" && (
                              <span className="qc-expense__note">
                                Interpretado por el asistente
                                {uneven ? ` · ${uneven}` : ""}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="qc-paid-by">
                              <Avatar member={expense.paidBy} />
                              {expense.paidBy.userId === currentUser.id
                                ? "Tú"
                                : expense.paidBy.name}
                            </span>
                          </td>
                          <td className="qc-num">
                            <Amount value={expense.amount} />
                          </td>
                          <td className="qc-num">
                            <Amount value={myShareOf(expense)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="qc-section">
            <h2 className="qc-section-title">Actividad reciente</h2>
            <ActivityList entries={group.activity.slice(0, 8)} now={now} />
          </section>
        </div>

        <div className="qc-group-grid__side">
          <section className="qc-section" id="balances" ref={balancesRef} tabIndex={-1}>
            <h2 className="qc-section-title">Balances</h2>
            <div className="qc-card qc-card--padded">
              <BalanceBars balances={group.balances} currentUserId={currentUser.id} />
            </div>
          </section>

          <section className="qc-section">
            <h2 className="qc-section-title">Saldar cuentas</h2>
            <div className="qc-card">
              {group.settlementPlan.length === 0 ? (
                <p className="qc-muted qc-empty">
                  El grupo está en cero. No hay nada que saldar.
                </p>
              ) : (
                <>
                  <ul className="qc-settle">
                    {group.settlementPlan.map((transfer) => (
                      <li
                        className="qc-settle__row"
                        key={`${transfer.from.userId}-${transfer.to.userId}-${transfer.amount}`}
                      >
                        <span className="qc-settle__who">{transferLabel(transfer)}</span>
                        <Amount value={transfer.amount} className="qc-settle__amount" />
                        <button
                          type="button"
                          className="qc-btn qc-btn--sm"
                          onClick={() => pay(transfer)}
                        >
                          Registrar pago
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="qc-settle__footer qc-eyebrow">
                    Con {group.settlementPlan.length === 1 ? "este pago" : `estos ${group.settlementPlan.length} pagos`}{" "}
                    el grupo queda en cero.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {showMembers && (
        <MembersDialog
          group={group}
          onClose={() => setShowMembers(false)}
          onSeeBalances={() => {
            balancesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            balancesRef.current?.focus();
          }}
        />
      )}
    </>
  );
}
