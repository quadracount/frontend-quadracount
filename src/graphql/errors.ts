import { CombinedGraphQLErrors } from "@apollo/client/errors";

/** Código del BFF (extensions.code): NOT_FOUND, CONFLICT, FORBIDDEN, UNAUTHENTICATED... */
export function errorCode(error: unknown): string | undefined {
  if (CombinedGraphQLErrors.is(error)) {
    const code = error.errors[0]?.extensions?.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Mensaje para mostrar al usuario. Los del BFF ya vienen en español y legibles. */
export function errorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? "Ocurrió un error inesperado.";
  }
  return "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
}
