import { parseEnv } from "./env.ts";

/** API base URL (VITE_API_URL, validated at dev/build start). Unset: mock clients. */
export const apiUrl = parseEnv(import.meta.env).apiUrl;
