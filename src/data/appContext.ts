import { createContext, use } from "react";
import type {
  ActivityEntry,
  CreateExpenseInput,
  ExpenseDraft,
  Group,
  Member,
  User,
} from "../lib/types";

export type Result =
  | { ok: true }
  | { ok: false; message: string };

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; reason: "BALANCE_PENDING"; member: Member; net: number }
  | { ok: false; reason: "OTHER"; message: string };

export interface AppContextValue {
  now: Date;

  currentUser: User | null;
  login: (email: string, password: string) => Result;
  register: (name: string, email: string, password: string) => Result;
  logout: () => void;

  myGroups: Group[];
  getGroup: (groupId: string) => Group | undefined;
  myActivity: (limit?: number) => ActivityEntry[];

  createGroup: (name: string) => Group;
  addMember: (groupId: string, email: string) => Result;
  removeMember: (groupId: string, userId: string) => RemoveMemberResult;
  createExpense: (input: CreateExpenseInput) => Result;
  registerPayment: (
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
  ) => Result;

  parseExpenseText: (groupId: string, text: string, paidBy: string) => ExpenseDraft;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) {
    throw new Error("useApp debe usarse dentro de <AppProvider>");
  }
  return value;
}
