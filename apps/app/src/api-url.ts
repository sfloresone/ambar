import { parseEnv } from "./env.ts";

const env = parseEnv(import.meta.env);

/** API base URL (VITE_API_URL, validated at dev/build start). Unset: mock clients. */
export const apiUrl = env.apiUrl;

/** The public site (VITE_SITE_URL): signed out, the app hands you back to it. */
export const siteUrl = env.siteUrl;
