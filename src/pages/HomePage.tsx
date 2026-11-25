import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { AvatarStack } from "../components/Avatar";
import { CreateGroupDialog } from "../components/CreateGroupDialog";
import { StatBand, StatCard } from "../components/StatBand";
import { errorMessage } from "../graphql/errors";
import { HOME, MY_BALANCES, POLL_MS } from "../graphql/operations";
import { formatMonthName, formatRelativeLong } from "../lib/dates";
import { balanceTone, formatAmount, formatSigned } from "../lib/money";

interface GroupWithBalance {
  name: string;
  myBalance: number;
}

function biggestContributor(groups: GroupWithBalance[], sign: 1 | -1) {
  const candidates = groups.filter((group) =>
    sign === 1 ? group.myBalance > 0 : group.myBalance < 0,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, group) =>
    Math.abs(group.myBalance) > Math.abs(best.myBalance) ? group : best,
  );
}

export function HomePage() {
  const now = new Date();
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Grupos y actividad (groups-service + activity-service)
  const home = useQuery(HOME, { pollInterval: POLL_MS });
  // Tu saldo en cada grupo (balances-service), en una consulta aparte
  const balances = useQuery(MY_BALANCES, { pollInterval: POLL_MS });

  const myGroups = home.data?.myGroups ?? [];
  const balanceOf = new Map(
    (balances.data?.myGroups ?? []).map((group) => [group.id, group.myBalance]),
  );
  const balancesAvailable = balances.data !== undefined;
  const withBalance: GroupWithBalance[] = myGroups.map((group) => ({
    name: group.name,
    myBalance: balanceOf.get(group.id) ?? 0,
  }));

  const total = withBalance.reduce((sum, group) => sum + group.myBalance, 0);
  const owedToMe = withBalance
    .filter((group) => group.myBalance > 0)
    .reduce((sum, group) => sum + group.myBalance, 0);
  const owedByMe = withBalance
    .filter((group) => group.myBalance < 0)
    .reduce((sum, group) => sum - group.myBalance, 0);

  const topCredit = biggestContributor(withBalance, 1);
  const topDebt = biggestContributor(withBalance, -1);
  const unavailable = "Saldos no disponibles por ahora";

  if (!home.data && home.loading) {
    return <p className="qc-muted qc-loading">Cargando tus grupos…</p>;
  }

  return (
    <>
      <header className="qc-page-header">
        <div>
          <p className="qc-eyebrow">{formatMonthName(now)}</p>
          <h1 className="qc-page-title">Inicio</h1>
        </div>
        <button
          type="button"
          className="qc-btn qc-btn--primary"
          onClick={() => setCreatingGroup(true)}
        >
          <span aria-hidden="true">+</span> Crear grupo
        </button>
      </header>

      {home.error && !home.data && (
        <p className="qc-notice qc-notice--error qc-section">
          {errorMessage(home.error)}
        </p>
      )}

      <StatBand>
        <StatCard
          label="Saldo total"
          value={balancesAvailable ? formatSigned(total) : "—"}
          tone={balancesAvailable ? balanceTone(total) : undefined}
          hint={
            !balancesAvailable
              ? unavailable
              : myGroups.length === 1
                ? "En tu único grupo"
                : `Sumando tus ${myGroups.length} grupos`
          }
        />
        <StatCard
          label="Te deben"
          value={balancesAvailable ? formatAmount(owedToMe) : "—"}
          hint={
            !balancesAvailable
              ? unavailable
              : topCredit
                ? `En ${topCredit.name}`
                : "Nadie te debe"
          }
        />
        <StatCard
          label="Debes"
          value={balancesAvailable ? formatAmount(owedByMe) : "—"}
          hint={
            !balancesAvailable ? unavailable : topDebt ? `En ${topDebt.name}` : "No debes nada"
          }
        />
      </StatBand>

      <section className="qc-section">
        <h2 className="qc-section-title">Tus grupos</h2>
        <div className="qc-card qc-section__card">
          {myGroups.length === 0 ? (
            <p className="qc-muted qc-empty">
              Todavía no tienes grupos. Crea el primero para empezar a dividir
              gastos.
            </p>
          ) : (
            <table className="qc-table qc-table--groups">
              <thead>
                <tr>
                  <th scope="col">Grupo</th>
                  <th scope="col">Miembros</th>
                  <th scope="col">Última actividad</th>
                  <th scope="col" className="qc-num">
                    Tu saldo
                  </th>
                  <th scope="col" aria-label="Abrir" />
                </tr>
              </thead>
              <tbody>
                {myGroups.map((group) => {
                  const last = group.activity[0]?.createdAt ?? null;
                  const balance = balanceOf.get(group.id);
                  return (
                    <tr key={group.id}>
                      <td>
                        <Link className="qc-link-strong" to={`/grupos/${group.id}`}>
                          {group.name}
                        </Link>
                      </td>
                      <td>
                        <AvatarStack members={group.members} />
                      </td>
                      <td className="qc-muted">
                        {last ? formatRelativeLong(last, now) : "sin actividad"}
                      </td>
                      <td
                        className={`qc-num qc-mono ${balance !== undefined ? balanceTone(balance) : "qc-muted"}`}
                      >
                        {balance === undefined
                          ? "—"
                          : balance === 0
                            ? "al día"
                            : formatSigned(balance)}
                      </td>
                      <td className="qc-num">
                        <Link
                          to={`/grupos/${group.id}`}
                          className="qc-chevron"
                          aria-label={`Abrir ${group.name}`}
                        >
                          ›
                        </Link>
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
        <h2 className="qc-section-title">Actividad en tus grupos</h2>
        <ActivityList entries={home.data?.myActivity ?? []} now={now} showGroup />
      </section>

      {creatingGroup && <CreateGroupDialog onClose={() => setCreatingGroup(false)} />}
    </>
  );
}
