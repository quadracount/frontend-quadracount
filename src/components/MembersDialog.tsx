import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useAuth } from "../auth/authContext";
import { errorCode, errorMessage } from "../graphql/errors";
import {
  ADD_MEMBER,
  BALANCE_QUERIES,
  REMOVE_MEMBER,
  type GroupSummary,
} from "../graphql/operations";
import { balanceTone, formatSigned } from "../lib/money";
import type { Member, MemberBalance } from "../lib/types";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";

interface Blocked {
  member: Member;
  net: number;
  /** Mensaje de groups-service (por ejemplo, "debe $8.000") */
  message?: string;
}

function BlockedRemovalDialog({
  blocked,
  onSeeBalances,
  onClose,
}: {
  blocked: Blocked;
  onSeeBalances: () => void;
  onClose: () => void;
}) {
  const owes = blocked.net < 0;

  return (
    <Dialog
      title={`No puedes quitar a ${blocked.member.name} todavía`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="qc-btn" onClick={onSeeBalances}>
            Ver balances
          </button>
          <button type="button" className="qc-btn qc-btn--primary" onClick={onClose}>
            Entendido
          </button>
        </>
      }
    >
      <p className="qc-dialog__lead">
        {blocked.member.name} tiene un saldo pendiente en este grupo. Cuando quede
        en cero podrás quitarlo.
      </p>
      {blocked.message && <p className="qc-muted qc-dialog__lead">{blocked.message}</p>}
      <div className="qc-notice qc-notice--debt">
        <Avatar member={blocked.member} size="lg" />
        <span className="qc-notice__text">
          {owes
            ? `${blocked.member.name} le debe al grupo`
            : `El grupo le debe a ${blocked.member.name}`}
        </span>
        <span className={`qc-mono qc-notice__amount ${balanceTone(blocked.net)}`}>
          {formatSigned(blocked.net)}
        </span>
      </div>
    </Dialog>
  );
}

export function MembersDialog({
  group,
  balances,
  onClose,
  onSeeBalances,
}: {
  group: GroupSummary;
  /** Saldos de balances-service; undefined si no está disponible */
  balances?: MemberBalance[];
  onClose: () => void;
  onSeeBalances: () => void;
}) {
  const { currentUser } = useAuth();
  const refetchQueries = [...BALANCE_QUERIES, "Group", "MyGroups", "Home"];
  const [addMember, { loading: adding }] = useMutation(ADD_MEMBER, { refetchQueries });
  const [removeMember] = useMutation(REMOVE_MEMBER, { refetchQueries });
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);

  const netOf = new Map((balances ?? []).map((b) => [b.member.userId, b.net]));

  const submitEmail = async () => {
    if (email.trim().length === 0) return;
    try {
      await addMember({ variables: { groupId: group.id, email } });
      setEmail("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  // groups-service le pregunta el saldo a balances-service (gRPC) antes de quitarlo
  const tryRemove = async (member: Member) => {
    try {
      await removeMember({ variables: { groupId: group.id, userId: member.userId } });
      setError(null);
    } catch (err) {
      if (errorCode(err) === "CONFLICT" && netOf.has(member.userId)) {
        setBlocked({ member, net: netOf.get(member.userId) ?? 0, message: errorMessage(err) });
      } else {
        setError(errorMessage(err));
      }
    }
  };

  if (blocked) {
    return (
      <BlockedRemovalDialog
        blocked={blocked}
        onClose={() => setBlocked(null)}
        onSeeBalances={() => {
          setBlocked(null);
          onClose();
          onSeeBalances();
        }}
      />
    );
  }

  return (
    <Dialog
      title="Miembros"
      onClose={onClose}
      footer={
        <button type="button" className="qc-btn qc-btn--primary" onClick={onClose}>
          Listo
        </button>
      }
    >
      <ul className="qc-member-list">
        {group.members.map((member) => (
          <li className="qc-member-list__item" key={member.userId}>
            <Avatar member={member} size="lg" />
            <span className="qc-member-list__name">
              {member.userId === currentUser?.id ? `${member.name} (tú)` : member.name}
            </span>
            {netOf.has(member.userId) ? (
              <span className={`qc-mono ${balanceTone(netOf.get(member.userId) ?? 0)}`}>
                {formatSigned(netOf.get(member.userId) ?? 0)}
              </span>
            ) : (
              <span className="qc-mono qc-muted">—</span>
            )}
            <button
              type="button"
              className="qc-btn qc-btn--sm"
              onClick={() => tryRemove(member)}
              disabled={member.userId === currentUser?.id}
              title={
                member.userId === currentUser?.id
                  ? "No puedes quitarte a ti mismo"
                  : undefined
              }
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <div className="qc-member-add">
        <label className="qc-field">
          <span className="qc-field__label">
            Agregar por correo (la persona ya tiene que estar registrada)
          </span>
          <div className="qc-member-add__row">
            <input
              className="qc-input"
              type="email"
              value={email}
              placeholder="camila@quadracount.dev"
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitEmail();
              }}
            />
            <button
              type="button"
              className="qc-btn"
              onClick={submitEmail}
              disabled={email.trim().length === 0 || adding}
            >
              {adding ? "Agregando…" : "Agregar"}
            </button>
          </div>
        </label>
        {error && <p className="qc-notice qc-notice--error">{error}</p>}
      </div>
    </Dialog>
  );
}
