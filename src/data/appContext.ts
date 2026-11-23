/**
 * Contrato del estado de la aplicación.
 *
 * Las operaciones tienen a propósito la misma forma que las del schema
 * GraphQL del BFF (CLAUDE.md, sección 6.4): `myGroups`, `group`, `myActivity`,
 * `createExpense`, `registerPayment`, `removeMember`, `parseExpenseText`.
 * Hoy las resuelve `AppProvider` contra datos en memoria; en la Fase 4 se
 * reemplaza esa implementación por Apollo Client sin tocar las pantallas.
 */

import { createContext, use } from "react";
import type {
  ActivityEntry,
  CreateExpenseInput,
  ExpenseDraft,
  Group,
  Member,
  User,
} from "../lib/types";

/** Resultado de una operación que el backend podría rechazar. */
export type Result =
  | { ok: true }
  | { ok: false; message: string };

/**
 * `removeMember` falla con `FAILED_PRECONDITION` si el miembro tiene saldo
 * distinto de 0, e informa cuánto debe para poder mostrar el aviso.
 */
export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; reason: "BALANCE_PENDING"; member: Member; net: number }
  | { ok: false; reason: "OTHER"; message: string };

export interface AppContextValue {
  /** Fecha de referencia para las etiquetas relativas. */
  now: Date;

  /** Sesión */
  currentUser: User | null;
  login: (email: string, password: string) => Result;
  register: (name: string, email: string, password: string) => Result;
  logout: () => void;

  /** Consultas */
  myGroups: Group[];
  getGroup: (groupId: string) => Group | undefined;
  myActivity: (limit?: number) => ActivityEntry[];

  /** Mutaciones */
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

  /** Interpretación de texto libre (hoy local, luego el mcp-server). */
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
