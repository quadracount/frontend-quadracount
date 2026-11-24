import { balanceTone, formatAmount, formatSigned } from "../lib/money";

export function Amount({
  value,
  signed = false,
  className = "",
}: {
  value: number;
  signed?: boolean;
  className?: string;
}) {
  const tone = signed ? balanceTone(value) : "";
  return (
    <span className={`qc-mono ${tone} ${className}`.trim()}>
      {signed ? formatSigned(value) : formatAmount(value)}
    </span>
  );
}
