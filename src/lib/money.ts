/**
 * Montos en pesos chilenos enteros. Nunca decimales ni floats
 * (CLAUDE.md, seccion 1).
 */

const formatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** Signo menos tipografico (U+2212), no el guion del teclado. */
export const MINUS = "−";

/** Solo el numero: 45000 -> "45.000". */
export function formatNumber(amount: number): string {
  return formatter.format(Math.abs(Math.trunc(amount)));
}

/** Monto sin signo: 45000 -> "$45.000". */
export function formatAmount(amount: number): string {
  return `$${formatNumber(amount)}`;
}

/**
 * Monto con signo explicito, para no depender solo del color
 * (CLAUDE.md, seccion 7): 12000 -> "+$12.000", -8000 -> "menos $8.000".
 */
export function formatSigned(amount: number): string {
  if (amount === 0) return "$0";
  const sign = amount > 0 ? "+" : MINUS;
  return `${sign}$${formatNumber(amount)}`;
}

/** Variante compacta para la barra lateral: "+12.000", menos "3.500", "0". */
export function formatSignedCompact(amount: number): string {
  if (amount === 0) return "0";
  const sign = amount > 0 ? "+" : MINUS;
  return `${sign}${formatNumber(amount)}`;
}

/** Clase de color segun el saldo. */
export function balanceTone(amount: number): string {
  if (amount > 0) return "qc-credit";
  if (amount < 0) return "qc-debt";
  return "qc-muted";
}
