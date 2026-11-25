import { useQuery } from "@apollo/client/react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { MY_BALANCES, MY_GROUPS, POLL_MS } from "../graphql/operations";
import { balanceTone, formatSignedCompact } from "../lib/money";
import { Avatar } from "./Avatar";

function Logo() {
  return (
    <span className="qc-logo">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="1" width="13" height="13" rx="3.5" fill="currentColor" />
        <rect
          x="8"
          y="8"
          width="13"
          height="13"
          rx="3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span className="qc-logo__text">quadracount</span>
    </span>
  );
}

export function Sidebar({
  onCreateGroup,
  onNavigate,
}: {
  onCreateGroup: () => void;
  onNavigate?: () => void;
}) {
  const { currentUser, logout } = useAuth();
  const groups = useQuery(MY_GROUPS);
  // Los saldos vienen de balances-service: si no responde, la lista se muestra igual
  const balances = useQuery(MY_BALANCES, { pollInterval: POLL_MS });
  const myGroups = groups.data?.myGroups ?? [];
  const balanceOf = new Map(
    (balances.data?.myGroups ?? []).map((group) => [group.id, group.myBalance]),
  );

  return (
    <aside className="qc-sidebar">
      <NavLink to="/" className="qc-sidebar__brand" onClick={onNavigate}>
        <Logo />
      </NavLink>

      <nav className="qc-sidebar__nav">
        <NavLink to="/" end className="qc-sidebar__link" onClick={onNavigate}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M2 7.2 8 2.3l6 4.9V14H9.8v-3.6H6.2V14H2V7.2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Inicio
        </NavLink>

        <p className="qc-sidebar__heading">Grupos</p>

        <ul className="qc-sidebar__groups">
          {myGroups.map((group) => (
            <li key={group.id}>
              <NavLink
                to={`/grupos/${group.id}`}
                className="qc-sidebar__link qc-sidebar__link--group"
                onClick={onNavigate}
              >
                <span className="qc-sidebar__group-name">{group.name}</span>
                {balanceOf.has(group.id) && (
                  <span
                    className={`qc-mono qc-sidebar__group-balance ${balanceTone(balanceOf.get(group.id) ?? 0)}`}
                  >
                    {formatSignedCompact(balanceOf.get(group.id) ?? 0)}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <button type="button" className="qc-sidebar__new" onClick={onCreateGroup}>
          <span aria-hidden="true">+</span> Nuevo grupo
        </button>
      </nav>

      {currentUser && (
        <div className="qc-sidebar__user">
          <Avatar member={{ userId: currentUser.id, name: currentUser.name }} />
          <span className="qc-sidebar__user-name">{currentUser.name}</span>
          <button type="button" className="qc-btn qc-btn--ghost qc-btn--sm" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
