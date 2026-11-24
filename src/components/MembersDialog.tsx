import { useState } from "react";
import { useApp } from "../data/appContext";
import { balanceTone, formatSigned } from "../lib/money";
import type { Group, Member } from "../lib/types";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";

interface Blocked {
  member: Member;
  net: number;
}

function BlockedRemovalDialog({
  blocked,
  currentUserName,
  onSeeBalances,
  onClose,
}: {
  blocked: Blocked;
  currentUserName: string;
  onSeeBalances: () => void;
  onClose: () => void;
}) {
  const owesMe = blocked.net < 0;

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
      <div className="qc-notice qc-notice--debt">
        <Avatar member={blocked.member} size="lg" />
        <span className="qc-notice__text">
          {owesMe
            ? `${blocked.member.name} le debe a ${currentUserName}`
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
  onClose,
  onSeeBalances,
}: {
  group: Group;
  onClose: () => void;
  onSeeBalances: () => void;
}) {
  const { addMember, removeMember, currentUser } = useApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);

  const submitEmail = () => {
    const result = addMember(group.id, email);
    if (result.ok) {
      setEmail("");
      setError(null);
    } else {
      setError(result.message);
    }
  };

  const tryRemove = (member: Member) => {
    const result = removeMember(group.id, member.userId);
    if (result.ok) return;
    if (result.reason === "BALANCE_PENDING") {
      setBlocked({ member: result.member, net: result.net });
    } else {
      setError(result.message);
    }
  };

  if (blocked) {
    return (
      <BlockedRemovalDialog
        blocked={blocked}
        currentUserName={currentUser?.name ?? "ti"}
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
        {group.balances.map(({ member, net }) => (
          <li className="qc-member-list__item" key={member.userId}>
            <Avatar member={member} size="lg" />
            <span className="qc-member-list__name">
              {member.userId === currentUser?.id ? `${member.name} (tú)` : member.name}
            </span>
            <span className={`qc-mono ${balanceTone(net)}`}>{formatSigned(net)}</span>
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
                if (event.key === "Enter") submitEmail();
              }}
            />
            <button
              type="button"
              className="qc-btn"
              onClick={submitEmail}
              disabled={email.trim().length === 0}
            >
              Agregar
            </button>
          </div>
        </label>
        {error && <p className="qc-notice qc-notice--error">{error}</p>}
      </div>
    </Dialog>
  );
}
