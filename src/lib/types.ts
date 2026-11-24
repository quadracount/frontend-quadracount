export type ExpenseSource = "MANUAL" | "ASSISTANT";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Member {
  userId: string;
  name: string;
}

export interface Share {
  userId: string;
  name: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: Member;
  shares: Share[];
  source: ExpenseSource;
  createdAt: string;
}

export interface MemberBalance {
  member: Member;
  net: number;
}

export interface Transfer {
  from: Member;
  to: Member;
  amount: number;
}

export interface ActivityEntry {
  id: string;
  groupId: string;
  groupName?: string;
  text: string;
  actorName: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  myBalance: number;
  expenses: Expense[];
  balances: MemberBalance[];
  settlementPlan: Transfer[];
  activity: ActivityEntry[];
}

export interface Interpretation {
  phrase: string;
  meaning: string;
}

export interface ExpenseDraft {
  description: string;
  amount: number;
  paidBy: Member;
  shares: Share[];
  interpretations: Interpretation[];
  sumMatches: boolean;
}

export interface ShareInput {
  userId: string;
  amount: number;
}

export interface CreateExpenseInput {
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  shares: ShareInput[];
  source: ExpenseSource;
}
