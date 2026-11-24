import type { Expense, Member, MemberBalance, Share, Transfer } from "./types";

export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: string;
}

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

export function splitWithAdjustments(
  amount: number,
  participants: Member[],
  adjustments: Record<string, number>,
): Share[] {
  if (participants.length === 0) return [];

  const total = Math.trunc(amount);
  const adjustmentTotal = participants.reduce(
    (sum, member) => sum + (adjustments[member.userId] ?? 0),
    0,
  );

  const evenShares = splitEqually(total - adjustmentTotal, participants);

  return evenShares.map((share) => ({
    ...share,
    amount: share.amount + (adjustments[share.userId] ?? 0),
  }));
}

export function sharesMatchTotal(amount: number, shares: Share[]): boolean {
  return shares.reduce((sum, share) => sum + share.amount, 0) === Math.trunc(amount);
}

export function sumShares(shares: Share[]): number {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}

export function computeBalances(
  members: Member[],
  expenses: Expense[],
  payments: Payment[],
): MemberBalance[] {
  const net = new Map<string, number>();
  for (const member of members) net.set(member.userId, 0);

  const add = (userId: string, delta: number) => {
    if (!net.has(userId)) return;
    net.set(userId, (net.get(userId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    add(expense.paidBy.userId, expense.amount);
    for (const share of expense.shares) add(share.userId, -share.amount);
  }

  for (const payment of payments) {
    add(payment.fromUserId, payment.amount);
    add(payment.toUserId, -payment.amount);
  }

  return members.map((member) => ({
    member,
    net: net.get(member.userId) ?? 0,
  }));
}

export function computeSettlementPlan(balances: MemberBalance[]): Transfer[] {
  const debtors = balances
    .filter((entry) => entry.net < 0)
    .map((entry) => ({ member: entry.member, amount: -entry.net }));
  const creditors = balances
    .filter((entry) => entry.net > 0)
    .map((entry) => ({ member: entry.member, amount: entry.net }));

  const transfers: Transfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({ from: debtor.member, to: creditor.member, amount });

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }

  return transfers;
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
