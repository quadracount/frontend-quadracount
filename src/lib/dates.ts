const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MESES[date.getMonth()]}`;
}

export function formatMonthName(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return MESES_LARGOS[date.getMonth()];
}

export function formatTodayLabel(now: Date): string {
  return `Hoy, ${formatDayMonth(now.toISOString())}`;
}

export function formatRelativeShort(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < HORA) return `${Math.max(1, Math.round(diff / 60000))} min`;
  if (diff < DIA) return `${Math.floor(diff / HORA)} h`;

  const days = Math.floor(diff / DIA);
  if (days === 1) return "ayer";
  if (days < 7) return `${days} d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} sem`;
  return formatDayMonth(iso);
}

export function formatRelativeLong(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < HORA) {
    const minutes = Math.max(1, Math.round(diff / 60000));
    return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }
  if (diff < DIA) {
    const hours = Math.floor(diff / HORA);
    return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  const days = Math.floor(diff / DIA);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} dias`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  return formatDayMonth(iso);
}

export function isSameMonth(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  );
}
