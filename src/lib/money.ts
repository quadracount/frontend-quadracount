const formatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

// Signo menos tipográfico (U+2212), no el guion.
export const MINUS = "−";

export function formatNumber(amount: number): string {
  return formatter.format(Math.abs(Math.trunc(amount)));
}

export function formatAmount(amount: number): string {
  return `$${formatNumber(amount)}`;
}

export function formatSigned(amount: number): string {
  if (amount === 0) return "$0";
  const sign = amount > 0 ? "+" : MINUS;
  return `${sign}$${formatNumber(amount)}`;
}

export function formatSignedCompact(amount: number): string {
  if (amount === 0) return "0";
  const sign = amount > 0 ? "+" : MINUS;
  return `${sign}${formatNumber(amount)}`;
}

export function balanceTone(amount: number): string {
  if (amount > 0) return "qc-credit";
  if (amount < 0) return "qc-debt";
  return "qc-muted";
}
