import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { readToken, SESSION_EXPIRED_EVENT } from "./session";

/** El frontend habla con el BFF únicamente por GraphQL. */
const BFF_URL = import.meta.env.VITE_BFF_URL ?? "http://localhost:3000/graphql";

// Agrega "Authorization: Bearer <token>" a cada petición si hay sesión
const authLink = new SetContextLink((prevContext) => {
  const token = readToken();
  return token
    ? { headers: { ...prevContext.headers, authorization: `Bearer ${token}` } }
    : {};
});

// Si el BFF responde UNAUTHENTICATED (token vencido o inválido), se avisa a
// AuthProvider para que cierre la sesión y la app vuelva a "Iniciar sesión".
const sessionLink = new ErrorLink(({ error, operation }) => {
  const isAuthOperation = ["Login", "Register"].includes(operation.operationName ?? "");
  if (
    !isAuthOperation &&
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED")
  ) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([sessionLink, authLink, new HttpLink({ uri: BFF_URL })]),
  cache: new InMemoryCache(),
  defaultOptions: {
    // Muestra lo que hay en caché y lo actualiza con el BFF
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
