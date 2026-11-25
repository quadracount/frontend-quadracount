import { createContext, use } from "react";
import type { User } from "../lib/types";

export interface AuthContextValue {
  currentUser: User | null;
  /** true mientras se verifica un token guardado al abrir la app */
  checking: boolean;
  /** Mensaje para la pantalla de inicio de sesión (por ejemplo, sesión expirada) */
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return value;
}
