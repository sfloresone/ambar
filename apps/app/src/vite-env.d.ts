/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Validated by src/env.ts; read it through src/api-url.ts. */
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_URL: string;
}
