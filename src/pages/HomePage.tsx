import { useState } from "react";
import { Link } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { AvatarStack } from "../components/Avatar";
import { CreateGroupDialog } from "../components/CreateGroupDialog";
import { StatBand, StatCard } from "../components/StatBand";
import { useApp } from "../data/appContext";
import { formatMonthName, formatRelativeLong } from "../lib/dates";
import { balanceTone, formatAmount, formatSigned } from "../lib/money";
import type { Group } from "../lib/types";

function lastActivityAt(group: Group): string | null {
  return group.activity[0]?.createdAt ?? null;
}

/** Grupo que más aporta al total, para la línea de ayuda de la tarjeta. */
function biggestContributor(groups: Group[], sign: 1 | -1): Group | null {
  const candidates = groups.filter((group) =>
    sign === 1 ? group.myBalance > 0 : group.myBalance < 0,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, group) =>
    Math.abs(group.myBalance) > Math.abs(best.myBalance) ? group : best,
  );
}

export function HomePage() {
  const { myGroups, myActivity, now } = useApp();
  const [creatingGroup, setCreatingGroup] = useState(false);

  const total = myGroups.reduce((sum, group) => sum + group.myBalance, 0);
  const owedToMe = myGroups
    .filter((group) => group.myBalance > 0)
    .reduce((sum, group) => sum + group.myBalance, 0);
  const owedByMe = myGroups
    .filter((group) => group.myBalance < 0)
    .reduce((sum, group) => sum - group.myBalance, 0);

  const topCredit = biggestContributor(myGroups, 1);
  const topDebt = biggestContributor(myGroups, -1);

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

      <StatBand>
        <StatCard
          label="Saldo total"
          value={formatSigned(total)}
          tone={balanceTone(total)}
          hint={
            myGroups.length === 1
              ? "En tu único grupo"
              : `Sumando tus ${myGroups.length} grupos`
          }
        />
        <StatCard
          label="Te deben"
          value={formatAmount(owedToMe)}
          hint={topCredit ? `En ${topCredit.name}` : "Nadie te debe"}
        />
        <StatCard
          label="Debes"
          value={formatAmount(owedByMe)}
          hint={topDebt ? `En ${topDebt.name}` : "No debes nada"}
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
                  const last = lastActivityAt(group);
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
                      <td className={`qc-num qc-mono ${balanceTone(group.myBalance)}`}>
                        {group.myBalance === 0 ? "al día" : formatSigned(group.myBalance)}
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
        <ActivityList entries={myActivity(8)} now={now} showGroup />
      </section>

      {creatingGroup && <CreateGroupDialog onClose={() => setCreatingGroup(false)} />}
    </>
  );
}
