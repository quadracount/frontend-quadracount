import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  ActivityEntry,
  CreateExpenseInput,
  Expense,
  ExpenseDraft,
  Member,
  MemberBalance,
  Transfer,
  User,
} from "../lib/types";

// Todas las operaciones GraphQL del frontend contra el BFF (schema en bff-gateway/schema.gql).
//
// Los datos de un grupo se piden en dos consultas separadas:
// - GROUP (groups-service + activity-service): miembros, gastos y actividad.
// - GROUP_BALANCES (balances-service): saldos y plan para saldar.
// Así, si balances-service está caído, el resto de la pantalla sigue funcionando.

const MEMBER = gql`
  fragment MemberFields on Member {
    userId
    name
  }
`;

const ACTIVITY = gql`
  fragment ActivityFields on ActivityEntry {
    id
    groupId
    groupName
    text
    actorName
    createdAt
  }
`;

// ---------- Sesión ----------

export const ME: TypedDocumentNode<{ me: User }> = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

type AuthPayload = { token: string; user: User };

export const LOGIN: TypedDocumentNode<
  { login: AuthPayload },
  { email: string; password: string }
> = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const REGISTER: TypedDocumentNode<
  { register: AuthPayload },
  { name: string; email: string; password: string }
> = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

// ---------- Inicio y barra lateral ----------

export interface GroupSummary {
  id: string;
  name: string;
  members: Member[];
}

export const MY_GROUPS: TypedDocumentNode<{ myGroups: GroupSummary[] }> = gql`
  ${MEMBER}
  query MyGroups {
    myGroups {
      id
      name
      members {
        ...MemberFields
      }
    }
  }
`;

/** Tu saldo en cada grupo (balances-service), aparte para que su falla no bloquee lo demás. */
export const MY_BALANCES: TypedDocumentNode<{
  myGroups: { id: string; myBalance: number }[];
}> = gql`
  query MyBalances {
    myGroups {
      id
      myBalance
    }
  }
`;

export const HOME: TypedDocumentNode<{
  myGroups: (GroupSummary & { activity: ActivityEntry[] })[];
  myActivity: ActivityEntry[];
}> = gql`
  ${MEMBER}
  ${ACTIVITY}
  query Home {
    myGroups {
      id
      name
      members {
        ...MemberFields
      }
      activity(limit: 1) {
        ...ActivityFields
      }
    }
    myActivity(limit: 8) {
      ...ActivityFields
    }
  }
`;

// ---------- Detalle del grupo ----------

export interface GroupDetail extends GroupSummary {
  expenses: Expense[];
  activity: ActivityEntry[];
}

export const GROUP: TypedDocumentNode<
  { group: GroupDetail | null },
  { id: string }
> = gql`
  ${MEMBER}
  ${ACTIVITY}
  query Group($id: ID!) {
    group(id: $id) {
      id
      name
      members {
        ...MemberFields
      }
      expenses {
        id
        description
        amount
        paidBy {
          ...MemberFields
        }
        shares {
          userId
          name
          amount
        }
        source
        createdAt
      }
      activity(limit: 8) {
        ...ActivityFields
      }
    }
  }
`;

export interface GroupBalances {
  id: string;
  myBalance: number;
  balances: MemberBalance[];
  settlementPlan: Transfer[];
}

export const GROUP_BALANCES: TypedDocumentNode<
  { group: GroupBalances | null },
  { id: string }
> = gql`
  ${MEMBER}
  query GroupBalances($id: ID!) {
    group(id: $id) {
      id
      myBalance
      balances {
        member {
          ...MemberFields
        }
        net
      }
      settlementPlan {
        from {
          ...MemberFields
        }
        to {
          ...MemberFields
        }
        amount
      }
    }
  }
`;

// ---------- Mutaciones ----------

export const CREATE_GROUP: TypedDocumentNode<
  { createGroup: GroupSummary },
  { name: string }
> = gql`
  ${MEMBER}
  mutation CreateGroup($name: String!) {
    createGroup(name: $name) {
      id
      name
      members {
        ...MemberFields
      }
    }
  }
`;

export const ADD_MEMBER: TypedDocumentNode<
  { addMember: GroupSummary },
  { groupId: string; email: string }
> = gql`
  ${MEMBER}
  mutation AddMember($groupId: ID!, $email: String!) {
    addMember(groupId: $groupId, email: $email) {
      id
      name
      members {
        ...MemberFields
      }
    }
  }
`;

export const REMOVE_MEMBER: TypedDocumentNode<
  { removeMember: GroupSummary },
  { groupId: string; userId: string }
> = gql`
  ${MEMBER}
  mutation RemoveMember($groupId: ID!, $userId: ID!) {
    removeMember(groupId: $groupId, userId: $userId) {
      id
      name
      members {
        ...MemberFields
      }
    }
  }
`;

export const CREATE_EXPENSE: TypedDocumentNode<
  { createExpense: { id: string } },
  { input: CreateExpenseInput }
> = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

export const REGISTER_PAYMENT: TypedDocumentNode<
  { registerPayment: { amount: number } },
  { groupId: string; fromUserId: string; toUserId: string; amount: number }
> = gql`
  mutation RegisterPayment(
    $groupId: ID!
    $fromUserId: ID!
    $toUserId: ID!
    $amount: Int!
  ) {
    registerPayment(
      groupId: $groupId
      fromUserId: $fromUserId
      toUserId: $toUserId
      amount: $amount
    ) {
      amount
    }
  }
`;

export const PARSE_EXPENSE_TEXT: TypedDocumentNode<
  { parseExpenseText: ExpenseDraft },
  { groupId: string; text: string; paidBy: string }
> = gql`
  ${MEMBER}
  mutation ParseExpenseText($groupId: ID!, $text: String!, $paidBy: ID!) {
    parseExpenseText(groupId: $groupId, text: $text, paidBy: $paidBy) {
      description
      amount
      paidBy {
        ...MemberFields
      }
      shares {
        userId
        name
        amount
      }
      interpretations {
        phrase
        meaning
      }
      sumMatches
    }
  }
`;

/** Consultas que dependen de los saldos: se vuelven a pedir después de un pago o un cambio de miembros. */
export const BALANCE_QUERIES = ["GroupBalances", "MyBalances"];

/** Las pantallas se actualizan solas cada 5 s (por ejemplo, cuando balances-service se recupera). */
export const POLL_MS = 5000;
