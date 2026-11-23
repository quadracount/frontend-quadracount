import { balanceTone, formatAmount, formatSigned } from "../lib/money";

/**
 * Monto en Geist Mono. Con `signed`, lleva siempre el signo y el color del
 * saldo; sin `signed`, es un total neutro como el de un gasto.
 */
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
