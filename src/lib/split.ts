import type { Expense, Member, Share } from "./types";

// Ayudas de presentación del formulario. Los saldos y el plan para saldar los
// calcula balances-service; el BFF valida que las partes sumen el total.

// Si no es exacta, el resto se reparte de a $1 en el orden de los miembros.
export function splitEqually(amount: number, participants: Member[]): Share[] {
  if (participants.length === 0) return [];

  const total = Math.trunc(amount);
  const base = Math.floor(total / participants.length);
  let remainder = total - base * participants.length;

  return participants.map((member) => {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    return { userId: member.userId, name: member.name, amount: share };
  });
}

export function sumShares(shares: Share[]): number {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}

export function describeUnevenShares(expense: Expense): string | null {
  if (expense.shares.length < 2) return null;

  const counts = new Map<number, number>();
  for (const share of expense.shares) {
    counts.set(share.amount, (counts.get(share.amount) ?? 0) + 1);
  }
  if (counts.size === 1) return null;

  let reference = expense.shares[0].amount;
  let bestCount = 0;
  for (const [amount, count] of counts) {
    if (count > bestCount || (count === bestCount && amount > reference)) {
      reference = amount;
      bestCount = count;
    }
  }

  const odd = expense.shares.filter((share) => share.amount !== reference);
  if (odd.length === 0 || odd.length > 2) return null;

  return odd
    .map((share) => {
      const diff = share.amount - reference;
      const word = diff < 0 ? "menos" : "mas";
      return `${share.name} paga $${new Intl.NumberFormat("es-CL").format(
        Math.abs(diff),
      )} ${word}`;
    })
    .join(" · ");
}
