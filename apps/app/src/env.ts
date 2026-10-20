// The app's environment schema. Public by nature (bundled into the app): URLs only, never secrets.
// vite.config.ts parses it at dev/build start, so a bad value fails there, not in the user's browser.
import * as v from "valibot";

const EnvSchema = v.object({
  // Unset or empty: the sign-in flow uses the mock clients (code 123456, no emails).
  VITE_API_URL: v.optional(v.union([v.literal(""), v.pipe(v.string(), v.url("VITE_API_URL must be a URL"))])),
  // The public site (landing): where signing out, or arriving signed out, takes you.
  VITE_SITE_URL: v.pipe(v.string("VITE_SITE_URL is required"), v.url("VITE_SITE_URL must be a URL")),
});

export type AppEnv = {
  apiUrl?: string;
  siteUrl: string;
};

export function parseEnv(raw: Record<string, string | undefined>): AppEnv {
  const parsed = v.safeParse(EnvSchema, raw);

  if (!parsed.success) {
    throw new Error(`Invalid app environment (apps/app/.env.local): ${v.summarize(parsed.issues)}`);
  }

  return { apiUrl: parsed.output.VITE_API_URL || undefined, siteUrl: parsed.output.VITE_SITE_URL };
}
