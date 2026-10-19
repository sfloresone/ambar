// AuthClient over the Ambar API (apps/api, /v1/auth). Web: the session is an httpOnly cookie the
// browser sends by itself (credentials: "include"); scripts never see the token.
import { ProblemSchema, AuthError, CodeRequestSchema, ProvidersSchema, SessionResponseSchema, SignedInSchema, type AuthClient, type AuthErrorCode } from "@ambar/core";
import * as v from "valibot";

const AUTH_ERROR_CODES = ["invalid-email", "invalid-code", "too-many-attempts", "expired-code", "rate-limited", "network"] as const satisfies readonly AuthErrorCode[];

const AuthErrorCodeSchema = v.picklist(AUTH_ERROR_CODES);

const UNREACHABLE = "We couldn't reach Ambar. Check your connection and try again.";

type Method = "GET" | "POST" | "DELETE";

/** JSON bodies the auth endpoints accept. */
type AuthRequest = { email: string; returnTo?: string } | { email: string; code: string } | { token: string };

/** The API's error as an AuthError. Unknown codes and unreadable bodies read as "network". */
async function toAuthError(response: Response): Promise<AuthError> {
  const parsed = v.safeParse(ProblemSchema, await response.json().catch(() => null));

  if (!parsed.success) {
    return new AuthError("network", UNREACHABLE);
  }

  const problem = parsed.output;
  const code = v.safeParse(AuthErrorCodeSchema, problem.code);

  return new AuthError(code.success ? code.output : "network", problem.detail, {
    attemptsLeft: problem.attemptsLeft,
    retryAfterMs: problem.retryAfterMs,
  });
}

/** A successful response decoded with schema; anything unexpected is an AuthError. */
async function decode<TSchema extends v.GenericSchema>(response: Response, schema: TSchema): Promise<v.InferOutput<TSchema>> {
  if (!response.ok) {
    throw await toAuthError(response);
  }

  const parsed = v.safeParse(schema, await response.json().catch(() => null));

  if (!parsed.success) {
    throw new AuthError("network", UNREACHABLE);
  }

  return parsed.output;
}

export function createHttpAuth(apiUrl: string): AuthClient {
  const base = `${apiUrl.replace(/\/$/, "")}/v1/auth`;

  async function send(method: Method, path: string, body?: AuthRequest): Promise<Response> {
    const init: RequestInit = { method, credentials: "include" };

    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    try {
      return await fetch(`${base}${path}`, init);
    } catch {
      throw new AuthError("network", UNREACHABLE);
    }
  }

  return {
    async requestCode(email, options) {
      return decode(await send("POST", "/email", { email, returnTo: options?.returnTo }), CodeRequestSchema);
    },
    async verifyCode(email, code) {
      return decode(await send("POST", "/email/verify", { email, code }), SignedInSchema);
    },
    async verifyLink(token) {
      return decode(await send("POST", "/email/verify", { token }), SignedInSchema);
    },
    async signOut() {
      const response = await send("DELETE", "/session");

      if (!response.ok) {
        throw await toAuthError(response);
      }
    },
    async getSession() {
      const response = await send("GET", "/session");

      return response.status === 401 ? null : (await decode(response, SessionResponseSchema)).session;
    },
    async providers() {
      // No buttons beat buttons that fail: any problem reads as "none".
      try {
        return (await decode(await send("GET", "/providers"), ProvidersSchema)).providers;
      } catch {
        return [];
      }
    },
    async startProviderSignIn(provider, { returnTo }) {
      return `${base}/oauth/${provider}?${new URLSearchParams({ returnTo })}`;
    },
  };
}
