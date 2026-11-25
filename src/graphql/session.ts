// Token del usuario. Se guarda en localStorage (aceptable para este proyecto, ver plan).
const TOKEN_KEY = "quadracount.token";

/** Evento que avisa que el BFF rechazó el token (expiró o no es válido). */
export const SESSION_EXPIRED_EVENT = "quadracount:session-expired";

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sin localStorage (modo privado estricto) la sesión dura hasta recargar la página
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nada que borrar
  }
}
