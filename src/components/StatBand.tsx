import type { ReactNode } from "react";

/** Franja de tarjetas con las cifras principales de una pantalla. */
export function StatBand({ children }: { children: ReactNode }) {
  return <div className="qc-stat-band">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="qc-card qc-stat">
      <p className="qc-eyebrow">{label}</p>
      <p className={`qc-mono qc-stat__value ${tone}`.trim()}>{value}</p>
      {hint && <p className="qc-eyebrow qc-stat__hint">{hint}</p>}
    </div>
  );
}
