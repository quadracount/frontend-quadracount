import { splitWithAdjustments, sharesMatchTotal } from "./split";
import type { ExpenseDraft, Interpretation, Member } from "./types";

const MIL = 1000;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function parseQuantity(raw: string): number {
  const cleaned = normalize(raw).trim();
  if (cleaned === "una" || cleaned === "un" || cleaned === "uno") return 1;
  return Number(cleaned.replace(/[.\s]/g, "").replace(",", "."));
}

interface AmountMatch {
  amount: number;
  phrase: string;
}

function findTotal(text: string): AmountMatch | null {
  const patterns: Array<{ re: RegExp; scale: number }> = [
    { re: /(\d[\d.,]*|una|un)\s*lucas?\b/i, scale: MIL },
    { re: /(\d[\d.,]*)\s*(?:mil|k)\b/i, scale: MIL },
    { re: /\$\s?(\d[\d.,]*)/, scale: 1 },
    { re: /\b(\d{3,})\b/, scale: 1 },
  ];

  for (const { re, scale } of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    const quantity = parseQuantity(match[1]);
    if (!Number.isFinite(quantity)) continue;
    return { amount: Math.trunc(quantity * scale), phrase: match[0] };
  }
  return null;
}

interface AdjustmentMatch {
  userId: string;
  name: string;
  delta: number;
  phrase: string;
}

function findAdjustments(text: string, members: Member[]): AdjustmentMatch[] {
  const re =
    /([\p{L}]+)\s+(?:pone|paga|aporta|pagan|ponen)\s+(\d[\d.,]*|una|un)\s*(?:lucas?|mil|k|pesos)?\s*(menos|mas|más)/giu;

  const found: AdjustmentMatch[] = [];
  for (const match of text.matchAll(re)) {
    const [phrase, rawName, rawQuantity, direction] = match;

    const member = members.find(
      (candidate) => normalize(candidate.name) === normalize(rawName),
    );
    if (!member) continue;

    const quantity = parseQuantity(rawQuantity);
    if (!Number.isFinite(quantity)) continue;

    // "5 lucas" o "5" a secas se entienden como miles.
    const magnitude = quantity < 100 ? quantity * MIL : quantity;
    const sign = normalize(direction) === "menos" ? -1 : 1;

    found.push({
      userId: member.userId,
      name: member.name,
      delta: sign * Math.trunc(magnitude),
      phrase,
    });
  }
  return found;
}

const VERBOS = [
  "compre",
  "compramos",
  "pague",
  "pagamos",
  "puse",
  "pusimos",
  "gaste",
  "gastamos",
];

function findDescription(text: string, totalPhrase: string | null): string {
  let head = text.trim();

  if (totalPhrase) {
    const index = head.indexOf(totalPhrase);
    if (index > 0) head = head.slice(0, index);
  }

  head = head
    .replace(/[,;.].*$/s, "")
    .replace(/\b(por|de|en)\s*$/i, "")
    .trim();

  const words = head.split(/\s+/);
  if (words.length > 0 && VERBOS.includes(normalize(words[0]))) {
    words.shift();
  }

  const description = words.join(" ").trim();
  if (description.length === 0) return "Gasto";
  return description.charAt(0).toUpperCase() + description.slice(1);
}

function findEqualSplitPhrase(text: string): string | null {
  const re = /(el resto )?(en |a )?partes iguales|mitad y mitad|entre todos/i;
  const match = re.exec(text);
  return match ? match[0] : null;
}

function formatPesos(amount: number): string {
  return `$${new Intl.NumberFormat("es-CL").format(amount)}`;
}

// Provisional: reemplaza a parseExpenseText mientras no exista el mcp-server.
// Funciona por reglas, como el modo LLM_MODE=fallback.
export function interpretExpenseText(
  text: string,
  members: Member[],
  paidBy: Member,
): ExpenseDraft {
  const interpretations: Interpretation[] = [];

  const total = findTotal(text);
  const amount = total?.amount ?? 0;
  if (total) {
    interpretations.push({
      phrase: total.phrase,
      meaning: `Monto total: ${formatPesos(amount)}`,
    });
  }

  const adjustments = findAdjustments(text, members);
  const adjustmentMap: Record<string, number> = {};
  for (const adjustment of adjustments) {
    adjustmentMap[adjustment.userId] = adjustment.delta;
    interpretations.push({
      phrase: adjustment.phrase,
      meaning: `${adjustment.name} paga ${formatPesos(Math.abs(adjustment.delta))} ${
        adjustment.delta < 0 ? "menos" : "mas"
      } que el resto`,
    });
  }

  const shares = splitWithAdjustments(amount, members, adjustmentMap);

  const equalPhrase = findEqualSplitPhrase(text);
  if (equalPhrase && members.length > 0) {
    const adjustmentTotal = adjustments.reduce(
      (sum, adjustment) => sum + adjustment.delta,
      0,
    );
    const evenPart = Math.floor((amount - adjustmentTotal) / members.length);
    const left =
      adjustmentTotal === 0
        ? formatPesos(amount)
        : `${formatPesos(amount)} ${adjustmentTotal < 0 ? "+" : "−"} ${formatPesos(
            Math.abs(adjustmentTotal),
          )}`;
    interpretations.push({
      phrase: equalPhrase,
      meaning: `${
        adjustmentTotal === 0 ? left : `(${left})`
      } ÷ ${members.length} = ${formatPesos(evenPart)} por persona`,
    });
  }

  return {
    description: findDescription(text, total?.phrase ?? null),
    amount,
    paidBy,
    shares,
    interpretations,
    sumMatches: sharesMatchTotal(amount, shares),
  };
}
