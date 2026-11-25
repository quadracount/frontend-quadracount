/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del endpoint GraphQL del BFF. Se fija al construir (pnpm build / docker build). */
  readonly VITE_BFF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
