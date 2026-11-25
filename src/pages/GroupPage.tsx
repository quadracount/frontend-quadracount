import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { Amount } from "../components/Amount";
import { Avatar, AvatarStack } from "../components/Avatar";
import { BalanceBars } from "../components/BalanceBars";
import { MembersDialog } from "../components/MembersDialog";
import { StatBand, StatCard } from "../components/StatBand";
import { useAuth } from "../auth/authContext";
import { errorCode, errorMessage } from "../graphql/errors";
import {
  BALANCE_QUERIES,
  GROUP,
  GROUP_BALANCES,
  POLL_MS,
  REGISTER_PAYMENT,
} from "../graphql/operations";
import { formatDayMonth, formatMonthName, isSameMonth } from "../lib/dates";
import { balanceTone, formatAmount, formatSigned } from "../lib/money";
import { describeUnevenShares } from "../lib/split";
import type { Expense, Transfer } from "../lib/types";

type ExpenseFilter = "ALL" | "MINE";

export function GroupPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const now = new Date();

  const [filter, setFilter] = useState<ExpenseFilter>("ALL");
  const [showMembers, setShowMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const balancesRef = useRef<HTMLElement>(null);

  // Miembros, gastos y actividad (groups-service + activity-service)
  const groupQuery = useQuery(GROUP, {
    variables: { id: groupId },
    pollInterval: POLL_MS,
  });
  // Saldos y plan para saldar (balances-service), aparte: si balances-service
  // está caído, el resto de la pantalla sigue funcionando.
  const balancesQuery = useQuery(GROUP_BALANCES, {
    variables: { id: groupId },
    pollInterval: POLL_MS,
  });
  const [registerPayment] = useMutation(REGISTER_PAYMENT, {
    refetchQueries: [...BALANCE_QUERIES, "Group"],
  });

  const group = groupQuery.data?.group ?? null;
  const balances = balancesQuery.data?.group ?? null;

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
    // now cambia en cada render; basta con recalcular cuando cambian los gastos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, currentUser]);

  if (!group && groupQuery.loading) {
    return <p className="qc-muted qc-loading">Cargando el grupo…</p>;
  }

  const notFound = ["NOT_FOUND", "FORBIDDEN"].includes(errorCode(groupQuery.error) ?? "");
  if (groupQuery.error && !group && !notFound) {
    return (
      <div className="qc-section">
        <h1 className="qc-page-title">No se pudo cargar el grupo</h1>
        <p className="qc-notice qc-notice--error">{errorMessage(groupQuery.error)}</p>
      </div>
    );
  }

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

  const settlementPlan = balances?.settlementPlan ?? [];
  const myBalance = balances?.myBalance ?? 0;
  const peopleOwingMe = settlementPlan.filter(
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

  const transferKey = (transfer: Transfer) =>
    `${transfer.from.userId}-${transfer.to.userId}-${transfer.amount}`;

  // Solo se puede registrar un pago en el que participa quien inició sesión
  const takesPart = (transfer: Transfer) =>
    transfer.from.userId === currentUser.id || transfer.to.userId === currentUser.id;

  const pay = async (transfer: Transfer) => {
    setPaying(transferKey(transfer));
    try {
      await registerPayment({
        variables: {
          groupId: group.id,
          fromUserId: transfer.from.userId,
          toUserId: transfer.to.userId,
          amount: transfer.amount,
        },
      });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(null);
    }
  };

  const balancesUnavailable = (
    <p className="qc-unavailable">
      <strong>Saldos no disponibles por ahora.</strong> El servicio de saldos no
      responde; los gastos que registres se aplicarán apenas vuelva.
    </p>
  );

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
          value={balances ? formatSigned(myBalance) : "—"}
          tone={balances ? balanceTone(myBalance) : undefined}
          hint={
            !balances
              ? "Saldos no disponibles por ahora"
              : myBalance > 0
                ? `Te deben ${peopleOwingMe} ${peopleOwingMe === 1 ? "persona" : "personas"}`
                : myBalance < 0
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
            <div className={`qc-card ${balances ? "qc-card--padded" : ""}`}>
              {balances ? (
                <BalanceBars balances={balances.balances} currentUserId={currentUser.id} />
              ) : balancesQuery.loading ? (
                <p className="qc-muted qc-empty">Cargando saldos…</p>
              ) : (
                balancesUnavailable
              )}
            </div>
          </section>

          <section className="qc-section">
            <h2 className="qc-section-title">Saldar cuentas</h2>
            <div className="qc-card">
              {!balances ? (
                balancesQuery.loading ? (
                  <p className="qc-muted qc-empty">Cargando…</p>
                ) : (
                  balancesUnavailable
                )
              ) : settlementPlan.length === 0 ? (
                <p className="qc-muted qc-empty">
                  El grupo está en cero. No hay nada que saldar.
                </p>
              ) : (
                <>
                  <ul className="qc-settle">
                    {settlementPlan.map((transfer) => (
                      <li className="qc-settle__row" key={transferKey(transfer)}>
                        <span className="qc-settle__who">{transferLabel(transfer)}</span>
                        <Amount value={transfer.amount} className="qc-settle__amount" />
                        <button
                          type="button"
                          className="qc-btn qc-btn--sm"
                          onClick={() => pay(transfer)}
                          disabled={!takesPart(transfer) || paying !== null}
                          title={
                            takesPart(transfer)
                              ? undefined
                              : "Solo puedes registrar pagos en los que participas"
                          }
                        >
                          {paying === transferKey(transfer) ? "Registrando…" : "Registrar pago"}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="qc-settle__footer qc-eyebrow">
                    Con {settlementPlan.length === 1 ? "este pago" : `estos ${settlementPlan.length} pagos`}{" "}
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
          balances={balances?.balances}
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
