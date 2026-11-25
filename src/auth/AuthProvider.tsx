import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LOGIN, ME, REGISTER } from "../graphql/operations";
import { clearToken, readToken, saveToken, SESSION_EXPIRED_EVENT } from "../graphql/session";
import { AuthContext, type AuthContextValue } from "./authContext";

/**
 * Sesión del usuario: el token JWT que firma el BFF se guarda en localStorage y
 * Apollo lo envía en cada petición. El usuario actual sale de la consulta `me`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(readToken);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading } = useQuery(ME, {
    skip: token === null,
    fetchPolicy: "cache-first",
  });
  const [loginMutation] = useMutation(LOGIN);
  const [registerMutation] = useMutation(REGISTER);

  const startSession = useCallback(
    (newToken: string, user: { id: string; name: string; email: string }) => {
      saveToken(newToken);
      // Deja el usuario en caché para que `me` no tenga que ir al BFF
      // (__typename le indica a la caché de Apollo que es un User)
      client.writeQuery({
        query: ME,
        data: { me: { __typename: "User", ...user } as typeof user },
      });
      setNotice(null);
      setToken(newToken);
    },
    [client],
  );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    // Borra todo lo que quedó en caché de este usuario
    void client.clearStore();
  }, [client]);

  // El ErrorLink de Apollo avisa cuando el BFF rechaza el token
  useEffect(() => {
    const onExpired = () => {
      if (readToken() === null) return;
      setNotice("Tu sesión expiró o no es válida. Inicia sesión de nuevo.");
      logout();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser: token ? (data?.me ?? null) : null,
      checking: token !== null && loading && !data,
      notice,
      login: async (email, password) => {
        const result = await loginMutation({ variables: { email, password } });
        if (result.data) startSession(result.data.login.token, result.data.login.user);
      },
      register: async (name, email, password) => {
        const result = await registerMutation({ variables: { name, email, password } });
        if (result.data) startSession(result.data.register.token, result.data.register.user);
      },
      logout,
    }),
    [token, data, loading, notice, loginMutation, registerMutation, startSession, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
