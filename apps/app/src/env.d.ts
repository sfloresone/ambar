/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL for the keep flow. Unset today: mock clients (code 123456, no emails). */
  readonly VITE_API_URL?: string;
}
