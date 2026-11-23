import { balanceTone, formatSignedCompact } from "../lib/money";
import type { MemberBalance } from "../lib/types";

/**
 * Balances como barras divergentes: a la izquierda del eje quien debe, a la
 * derecha quien tiene a favor (CLAUDE.md, sección 7). El monto va siempre con
 * signo para no depender solo del color.
 */
export function BalanceBars({
  balances,
  currentUserId,
}: {
  balances: MemberBalance[];
  currentUserId: string;
}) {
  const max = Math.max(1, ...balances.map((entry) => Math.abs(entry.net)));
  const sorted = [...balances].sort((a, b) => b.net - a.net);

  return (
    <div className="qc-bars">
      {sorted.map(({ member, net }) => {
        const width = `${(Math.abs(net) / max) * 100}%`;
        const isMe = member.userId === currentUserId;

        return (
          <div className="qc-bars__row" key={member.userId}>
            <span className="qc-bars__name">{isMe ? "Tú" : member.name}</span>

            <span className="qc-bars__track">
              <span className="qc-bars__half qc-bars__half--left">
                {net < 0 && <span className="qc-bars__fill qc-bars__fill--debt" style={{ width }} />}
              </span>
              <span className="qc-bars__axis-line" aria-hidden="true" />
              <span className="qc-bars__half qc-bars__half--right">
                {net > 0 && (
                  <span className="qc-bars__fill qc-bars__fill--credit" style={{ width }} />
                )}
              </span>
            </span>

            <span className={`qc-mono qc-bars__value ${balanceTone(net)}`}>
              {formatSignedCompact(net)}
            </span>
          </div>
        );
      })}

      <p className="qc-bars__legend qc-eyebrow">
        <span>debe</span>
        <span>a favor</span>
      </p>
    </div>
  );
}
