/**
 * Reglas de negocio de division, saldos y plan para saldar
 * (CLAUDE.md, seccion 1).
 *
 * La fuente de verdad de estas reglas es el backend: groups-service valida
 * la division y balances-service calcula los saldos y el plan. Aqui se
 * replican solo para lo que la interfaz necesita resolver sola:
 *
 *  - la vista previa de la division en la pestana "Formulario",
 *  - la aritmetica del borrador mientras el mcp-server no existe,
 *  - recalcular los datos simulados al registrar un gasto o un pago.
 *
 * Cuando el backend este en pie, los saldos vienen de balances-service y
 * estas funciones quedan solo para las vistas previas del formulario.
 */

import type { Expense, Member, MemberBalance, Share, Transfer } from "./types";

export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: string;
}

/**
 * Division en partes iguales. Si no es exacta, el resto se reparte de a $1
 * entre los participantes, en el orden de la lista de miembros, de modo que
 * la suma de las partes sea siempre igual al total.
 */
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

/**
 * Division con ajustes: algunos miembros pagan una cantidad fija menos (o
 * mas) que el resto, y la diferencia se reparte entre todos. Es la regla que
 * necesita el ejemplo "Diego pone 5 lucas menos".
 *
 * El ajuste se descuenta de quien lo recibe y el total ajustado se divide en
 * partes iguales, igual que lo hace la tool `validate_split_consistency`.
 */
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

  // (total - ajustes) / n es la parte "del resto"; quien tiene ajuste paga esa
  // parte mas su ajuste (negativo para quien paga menos).
  const evenShares = splitEqually(total - adjustmentTotal, participants);

  return evenShares.map((share) => ({
    ...share,
    amount: share.amount + (adjustments[share.userId] ?? 0),
  }));
}

/** La suma de las partes tiene que ser igual al total. */
export function sharesMatchTotal(amount: number, shares: Share[]): boolean {
  return shares.reduce((sum, share) => sum + share.amount, 0) === Math.trunc(amount);
}

export function sumShares(shares: Share[]): number {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}

/**
 * Saldo neto de cada miembro:
 *   lo que pago - lo que le corresponde pagar + pagos enviados - pagos recibidos.
 * La suma de los saldos de un grupo siempre es 0.
 */
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

/**
 * Plan para saldar cuentas: emparejar repetidamente al que mas debe con al
 * que mas le deben, transfiriendo el menor de los dos montos, hasta que
 * todos queden en 0.
 */
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

/**
 * Describe en una frase por que un gasto no se dividio en partes iguales,
 * por ejemplo "Diego paga $5.000 menos". Se deduce de las partes guardadas,
 * porque el tipo `Expense` del schema no guarda la explicacion del asistente.
 * Devuelve null si la division fue pareja.
 */
export function describeUnevenShares(expense: Expense): string | null {
  if (expense.shares.length < 2) return null;

  const counts = new Map<number, number>();
  for (const share of expense.shares) {
    counts.set(share.amount, (counts.get(share.amount) ?? 0) + 1);
  }
  if (counts.size === 1) return null;

  // La parte "del resto" es la mas repetida; con empate, la mayor.
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
