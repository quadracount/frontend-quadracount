import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  computeBalances,
  computeSettlementPlan,
  type Payment,
} from "../lib/split";
import { interpretExpenseText } from "../lib/interpretExpenseText";
import { formatAmount } from "../lib/money";
import type {
  ActivityEntry,
  CreateExpenseInput,
  ExpenseDraft,
  Group,
  Member,
  User,
} from "../lib/types";
import {
  DEMO_NOW,
  DEMO_PASSWORD,
  seedActivity,
  seedExpenses,
  seedGroups,
  seedPayments,
  seedUsers,
  type StoredExpense,
  type StoredGroup,
} from "./seed";
import {
  AppContext,
  type AppContextValue,
  type RemoveMemberResult,
} from "./appContext";

const SESSION_KEY = "quadracount.session";

function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin localStorage la sesión dura lo que dure la pestaña.
  }
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Datos en memoria mientras no exista el BFF. En la Fase 4 se cambia
// por Apollo Client; las pantallas no cambian.
export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [groups, setGroups] = useState<StoredGroup[]>(seedGroups);
  const [expenses, setExpenses] = useState<StoredExpense[]>(seedExpenses);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [activity, setActivity] = useState<ActivityEntry[]>(seedActivity);
  const [currentUserId, setCurrentUserId] = useState<string | null>(readSession);

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  const now = DEMO_NOW;

  const appendActivity = useCallback(
    (groupId: string, actorName: string, text: string) => {
      setActivity((previous) => [
        {
          id: newId("a"),
          groupId,
          actorName,
          text,
          createdAt: new Date(now).toISOString(),
        },
        ...previous,
      ]);
    },
    [now],
  );

  const login = useCallback<AppContextValue["login"]>(
    (email, password) => {
      const user = users.find(
        (candidate) => normalizeEmail(candidate.email) === normalizeEmail(email),
      );
      // Mismo mensaje en ambos casos para no revelar qué correos existen.
      if (!user || password !== DEMO_PASSWORD) {
        return { ok: false, message: "Correo o contraseña incorrectos" };
      }
      setCurrentUserId(user.id);
      writeSession(user.id);
      return { ok: true };
    },
    [users],
  );

  const register = useCallback<AppContextValue["register"]>(
    (name, email, password) => {
      if (name.trim().length === 0) {
        return { ok: false, message: "Escribe tu nombre" };
      }
      if (password.length < 6) {
        return { ok: false, message: "La contraseña debe tener al menos 6 caracteres" };
      }
      const exists = users.some(
        (candidate) => normalizeEmail(candidate.email) === normalizeEmail(email),
      );
      if (exists) {
        return { ok: false, message: "Ese correo ya está registrado" };
      }

      const user: User = {
        id: newId("u"),
        name: name.trim(),
        email: normalizeEmail(email),
      };
      setUsers((previous) => [...previous, user]);
      setCurrentUserId(user.id);
      writeSession(user.id);
      return { ok: true };
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    writeSession(null);
  }, []);

  const myGroups = useMemo<Group[]>(() => {
    if (!currentUser) return [];

    return groups
      .filter((group) =>
        group.members.some((member) => member.userId === currentUser.id),
      )
      .map((group) => {
        const groupExpenses = expenses
          .filter((expense) => expense.groupId === group.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const groupPayments = payments.filter(
          (payment) => payment.groupId === group.id,
        );

        const balances = computeBalances(
          group.members,
          groupExpenses,
          groupPayments,
        );

        const myBalance =
          balances.find((entry) => entry.member.userId === currentUser.id)?.net ?? 0;

        return {
          id: group.id,
          name: group.name,
          members: group.members,
          myBalance,
          expenses: groupExpenses,
          balances,
          settlementPlan: computeSettlementPlan(balances),
          activity: activity
            .filter((entry) => entry.groupId === group.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        } satisfies Group;
      });
  }, [groups, expenses, payments, activity, currentUser]);

  const getGroup = useCallback(
    (groupId: string) => myGroups.find((group) => group.id === groupId),
    [myGroups],
  );

  const myActivity = useCallback(
    (limit = 20): ActivityEntry[] =>
      myGroups
        .flatMap((group) =>
          group.activity.map((entry) => ({ ...entry, groupName: group.name })),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    [myGroups],
  );

  const createGroup = useCallback(
    (name: string): Group => {
      if (!currentUser) throw new Error("No hay sesión iniciada");

      const stored: StoredGroup = {
        id: newId("g"),
        name: name.trim(),
        members: [{ userId: currentUser.id, name: currentUser.name }],
        createdAt: new Date(now).toISOString(),
      };
      setGroups((previous) => [...previous, stored]);

      return {
        ...stored,
        myBalance: 0,
        expenses: [],
        balances: [{ member: stored.members[0], net: 0 }],
        settlementPlan: [],
        activity: [],
      };
    },
    [currentUser, now],
  );

  const addMember = useCallback<AppContextValue["addMember"]>(
    (groupId, email) => {
      const user = users.find(
        (candidate) => normalizeEmail(candidate.email) === normalizeEmail(email),
      );
      if (!user) {
        return { ok: false, message: "No hay ninguna persona registrada con ese correo" };
      }

      const group = groups.find((candidate) => candidate.id === groupId);
      if (!group) return { ok: false, message: "El grupo no existe" };

      if (group.members.some((member) => member.userId === user.id)) {
        return { ok: false, message: `${user.name} ya es parte del grupo` };
      }

      const member: Member = { userId: user.id, name: user.name };
      setGroups((previous) =>
        previous.map((candidate) =>
          candidate.id === groupId
            ? { ...candidate, members: [...candidate.members, member] }
            : candidate,
        ),
      );
      appendActivity(groupId, user.name, `${user.name} se unió al grupo`);
      return { ok: true };
    },
    [users, groups, appendActivity],
  );

  const removeMember = useCallback(
    (groupId: string, userId: string): RemoveMemberResult => {
      const group = myGroups.find((candidate) => candidate.id === groupId);
      if (!group) return { ok: false, reason: "OTHER", message: "El grupo no existe" };

      const balance = group.balances.find((entry) => entry.member.userId === userId);
      if (!balance) {
        return { ok: false, reason: "OTHER", message: "Esa persona no es miembro" };
      }

      if (balance.net !== 0) {
        return {
          ok: false,
          reason: "BALANCE_PENDING",
          member: balance.member,
          net: balance.net,
        };
      }

      setGroups((previous) =>
        previous.map((candidate) =>
          candidate.id === groupId
            ? {
                ...candidate,
                members: candidate.members.filter(
                  (member) => member.userId !== userId,
                ),
              }
            : candidate,
        ),
      );
      appendActivity(groupId, balance.member.name, `${balance.member.name} salió del grupo`);
      return { ok: true };
    },
    [myGroups, appendActivity],
  );

  const createExpense = useCallback<AppContextValue["createExpense"]>(
    (input: CreateExpenseInput) => {
      const group = groups.find((candidate) => candidate.id === input.groupId);
      if (!group) return { ok: false, message: "El grupo no existe" };

      const total = input.shares.reduce((sum, share) => sum + share.amount, 0);
      if (total !== input.amount) {
        return {
          ok: false,
          message: "La suma de las partes no coincide con el monto total",
        };
      }

      const paidBy = group.members.find((member) => member.userId === input.paidBy);
      if (!paidBy) return { ok: false, message: "Quien pagó no es miembro del grupo" };

      const expense: StoredExpense = {
        id: newId("e"),
        groupId: input.groupId,
        description: input.description.trim(),
        amount: input.amount,
        paidBy,
        shares: input.shares.map((share) => ({
          userId: share.userId,
          name:
            group.members.find((member) => member.userId === share.userId)?.name ??
            share.userId,
          amount: share.amount,
        })),
        source: input.source,
        createdAt: new Date(now).toISOString(),
      };

      setExpenses((previous) => [...previous, expense]);

      const isMe = currentUser?.id === paidBy.userId;
      appendActivity(
        input.groupId,
        paidBy.name,
        `${isMe ? "Tú agregaste" : `${paidBy.name} agregó`} «${expense.description}» · ${formatAmount(expense.amount)}`,
      );
      return { ok: true };
    },
    [groups, currentUser, now, appendActivity],
  );

  const registerPayment = useCallback<AppContextValue["registerPayment"]>(
    (groupId, fromUserId, toUserId, amount) => {
      const group = groups.find((candidate) => candidate.id === groupId);
      if (!group) return { ok: false, message: "El grupo no existe" };

      if (currentUser && ![fromUserId, toUserId].includes(currentUser.id)) {
        return {
          ok: false,
          message: "Solo puedes registrar pagos en los que participas",
        };
      }
      if (amount <= 0) return { ok: false, message: "El monto debe ser mayor que 0" };

      const from = group.members.find((member) => member.userId === fromUserId);
      const to = group.members.find((member) => member.userId === toUserId);
      if (!from || !to) return { ok: false, message: "Esa persona no es miembro" };

      setPayments((previous) => [
        ...previous,
        {
          id: newId("p"),
          groupId,
          fromUserId,
          toUserId,
          amount,
          createdAt: new Date(now).toISOString(),
        },
      ]);

      const text =
        currentUser?.id === toUserId
          ? `${from.name} te pagó ${formatAmount(amount)}`
          : currentUser?.id === fromUserId
            ? `Le pagaste ${formatAmount(amount)} a ${to.name}`
            : `${from.name} le pagó ${formatAmount(amount)} a ${to.name}`;

      appendActivity(groupId, from.name, text);
      return { ok: true };
    },
    [groups, currentUser, now, appendActivity],
  );

  const parseExpenseText = useCallback(
    (groupId: string, text: string, paidBy: string): ExpenseDraft => {
      const group = groups.find((candidate) => candidate.id === groupId);
      if (!group) throw new Error("El grupo no existe");

      const payer =
        group.members.find((member) => member.userId === paidBy) ?? group.members[0];

      return interpretExpenseText(text, group.members, payer);
    },
    [groups],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      now,
      currentUser,
      login,
      register,
      logout,
      myGroups,
      getGroup,
      myActivity,
      createGroup,
      addMember,
      removeMember,
      createExpense,
      registerPayment,
      parseExpenseText,
    }),
    [
      now,
      currentUser,
      login,
      register,
      logout,
      myGroups,
      getGroup,
      myActivity,
      createGroup,
      addMember,
      removeMember,
      createExpense,
      registerPayment,
      parseExpenseText,
    ],
  );

  return <AppContext value={value}>{children}</AppContext>;
}
