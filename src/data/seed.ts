/**
 * Datos de ejemplo de CLAUDE.md (seccion 1), los mismos que usara el seed
 * del backend. Sirven para desarrollar las pantallas antes de que exista el
 * BFF y como caso de prueba a ojo: los saldos del grupo "Depto Los Carrera
 * 1450" tienen que dar Martín +12.000, Camila +1.000, Sofía -5.000 y
 * Diego -8.000.
 */

import type { ActivityEntry, ExpenseSource, Member, Share, User } from "../lib/types";
import type { Payment } from "../lib/split";

/**
 * Fecha fija de la demo. Los mockups estan dibujados como si hoy fuera el
 * 11 de noviembre, asi que las etiquetas relativas ("ayer", "4 d") se
 * calculan contra esta fecha y no contra el reloj real. Al conectar el
 * backend, basta reemplazarla por `new Date()`.
 */
export const DEMO_NOW = new Date("2026-11-11T11:00:00");

export const DEMO_PASSWORD = "quadra123";

export const seedUsers: User[] = [
  { id: "u-martin", name: "Martín", email: "martin@quadracount.dev" },
  { id: "u-camila", name: "Camila", email: "camila@quadracount.dev" },
  { id: "u-sofia", name: "Sofía", email: "sofia@quadracount.dev" },
  { id: "u-diego", name: "Diego", email: "diego@quadracount.dev" },
  { id: "u-valentina", name: "Valentina", email: "valentina@quadracount.dev" },
  { id: "u-tomas", name: "Tomás", email: "tomas@quadracount.dev" },
];

/** El usuario con el que arranca la demo. */
export const DEMO_USER_ID = "u-martin";

const member = (userId: string): Member => {
  const user = seedUsers.find((candidate) => candidate.id === userId);
  if (!user) throw new Error(`Usuario desconocido en el seed: ${userId}`);
  return { userId: user.id, name: user.name };
};

const share = (userId: string, amount: number): Share => ({
  ...member(userId),
  amount,
});

/**
 * Gasto tal como lo guarda groups-service. `StoredExpense` no incluye los
 * saldos: esos los calcula balances-service a partir de estos datos.
 */
export interface StoredExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: Member;
  shares: Share[];
  source: ExpenseSource;
  createdAt: string;
}

export interface StoredGroup {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
}

export const seedGroups: StoredGroup[] = [
  {
    id: "g-depto",
    name: "Depto Los Carrera 1450",
    members: [
      member("u-martin"),
      member("u-camila"),
      member("u-sofia"),
      member("u-diego"),
    ],
    createdAt: "2026-10-20T12:00:00",
  },
  {
    id: "g-proyecto",
    name: "Proyecto Ingeniería de Software",
    members: [member("u-martin"), member("u-valentina"), member("u-tomas")],
    createdAt: "2026-10-25T12:00:00",
  },
  {
    id: "g-paseo",
    name: "Paseo fin de semestre",
    members: [
      member("u-martin"),
      member("u-camila"),
      member("u-diego"),
      member("u-valentina"),
      member("u-tomas"),
      member("u-sofia"),
    ],
    createdAt: "2026-09-15T12:00:00",
  },
];

export const seedExpenses: StoredExpense[] = [
  {
    id: "e-mercaderia",
    groupId: "g-depto",
    description: "Mercadería y útiles de aseo",
    amount: 45000,
    paidBy: member("u-martin"),
    shares: [
      share("u-martin", 12500),
      share("u-camila", 12500),
      share("u-sofia", 12500),
      share("u-diego", 7500),
    ],
    source: "ASSISTANT",
    createdAt: "2026-11-06T18:20:00",
  },
  {
    id: "e-internet",
    groupId: "g-depto",
    description: "Internet noviembre",
    amount: 24000,
    paidBy: member("u-camila"),
    shares: [
      share("u-martin", 6000),
      share("u-camila", 6000),
      share("u-sofia", 6000),
      share("u-diego", 6000),
    ],
    source: "MANUAL",
    createdAt: "2026-11-07T10:15:00",
  },
  {
    id: "e-gas",
    groupId: "g-depto",
    description: "Gas",
    amount: 18000,
    paidBy: member("u-sofia"),
    shares: [
      share("u-martin", 4500),
      share("u-camila", 4500),
      share("u-sofia", 4500),
      share("u-diego", 4500),
    ],
    source: "MANUAL",
    createdAt: "2026-11-09T19:30:00",
  },
  {
    id: "e-impresion",
    groupId: "g-proyecto",
    description: "Impresión del informe",
    amount: 10500,
    paidBy: member("u-valentina"),
    shares: [
      share("u-martin", 3500),
      share("u-valentina", 3500),
      share("u-tomas", 3500),
    ],
    source: "MANUAL",
    createdAt: "2026-11-10T16:40:00",
  },
];

export const seedPayments: Payment[] = [
  {
    id: "p-diego-martin",
    groupId: "g-depto",
    fromUserId: "u-diego",
    toUserId: "u-martin",
    amount: 10000,
    createdAt: "2026-11-11T09:00:00",
  },
];

/**
 * Entradas de actividad como las escribe activity-service: texto ya legible,
 * no eventos crudos.
 */
export const seedActivity: ActivityEntry[] = [
  {
    id: "a-pago-diego",
    groupId: "g-depto",
    actorName: "Diego",
    text: "Diego te pagó $10.000",
    createdAt: "2026-11-11T09:00:00",
  },
  {
    id: "a-gas",
    groupId: "g-depto",
    actorName: "Sofía",
    text: "Sofía agregó «Gas» · $18.000",
    createdAt: "2026-11-09T19:30:00",
  },
  {
    id: "a-internet",
    groupId: "g-depto",
    actorName: "Camila",
    text: "Camila agregó «Internet noviembre» · $24.000",
    createdAt: "2026-11-07T10:15:00",
  },
  {
    id: "a-mercaderia",
    groupId: "g-depto",
    actorName: "Martín",
    text: "Tú agregaste «Mercadería y útiles de aseo» · $45.000",
    createdAt: "2026-11-06T18:20:00",
  },
  {
    id: "a-sofia-join",
    groupId: "g-depto",
    actorName: "Sofía",
    text: "Sofía se unió al grupo",
    createdAt: "2026-11-04T11:00:00",
  },
  {
    id: "a-impresion",
    groupId: "g-proyecto",
    actorName: "Valentina",
    text: "Valentina agregó «Impresión del informe» · $10.500",
    createdAt: "2026-11-10T16:40:00",
  },
  {
    id: "a-paseo-tomas",
    groupId: "g-paseo",
    actorName: "Tomás",
    text: "Tomás se unió al grupo",
    createdAt: "2026-10-28T15:00:00",
  },
];
