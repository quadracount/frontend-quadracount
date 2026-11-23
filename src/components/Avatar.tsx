import type { Member } from "../lib/types";

/**
 * Paleta de avatares, en la línea del marfil y el verde del resto de la
 * interfaz. El color se elige de forma determinista a partir del id, así la
 * misma persona siempre se ve igual.
 */
const PALETTE = [
  { background: "#cfe5df", color: "#12332f" },
  { background: "#f6e2bd", color: "#6b4b14" },
  { background: "#e3ddf2", color: "#3c3268" },
  { background: "#f7d9cf", color: "#8d3c1a" },
  { background: "#d8e6c9", color: "#3b5222" },
  { background: "#e8dcd0", color: "#6a4a33" },
];

function paletteFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 997;
  }
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  member,
  size = "md",
}: {
  member: Member;
  size?: "md" | "lg";
}) {
  const { background, color } = paletteFor(member.userId);
  return (
    <span
      className={`qc-avatar${size === "lg" ? " qc-avatar--lg" : ""}`}
      style={{ background, color }}
      title={member.name}
      aria-hidden="true"
    >
      {member.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarStack({
  members,
  max = 6,
}: {
  members: Member[];
  max?: number;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  return (
    <span className="qc-avatar-stack">
      {shown.map((member) => (
        <Avatar key={member.userId} member={member} />
      ))}
      {rest > 0 && (
        <span
          className="qc-avatar"
          style={{ background: "#e8e2d6", color: "#6a645a" }}
          aria-hidden="true"
        >
          +{rest}
        </span>
      )}
      <span className="qc-sr-only">
        {members.map((member) => member.name).join(", ")}
      </span>
    </span>
  );
}
