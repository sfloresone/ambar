// What a sign-in flow finds in the URL when the browser comes back to it: the email link (?verify=), or a
// provider's answer (?oauth= on success, ?error= on failure). Read by each platform's wrapper (routing is
// theirs), handed to the shared flow, then removed from the URL with AUTH_RETURN_PARAMS.
import type { ProviderErrorCode } from "./auth.ts";

export type AuthReturn = { kind: "verify"; token: string } | { kind: "provider"; created: boolean } | { kind: "error"; code: ProviderErrorCode };

/** Every parameter readAuthReturn reads, to strip once read (one-time values never linger in history). */
export const AUTH_RETURN_PARAMS = ["verify", "oauth", "error"] as const;

/** One sentence per provider error, for the email step (where the person can try again or use email). */
export const PROVIDER_ERROR_COPY = {
  "oauth-cancelled": "Signing in was cancelled. Try again, or use your email.",
  "oauth-state": "That sign-in took too long or started in another tab. Try again.",
  "oauth-email": "That account has no verified email. Verify it there, or use your email here.",
  "oauth-failed": "We couldn't sign you in with that account. Try again, or use your email.",
} as const satisfies Record<ProviderErrorCode, string>;

function isProviderError(code: string): code is ProviderErrorCode {
  return Object.hasOwn(PROVIDER_ERROR_COPY, code);
}

export function readAuthReturn(params: URLSearchParams): AuthReturn | null {
  const token = params.get("verify");

  if (token !== null && token !== "") {
    return { kind: "verify", token };
  }

  const result = params.get("oauth");

  if (result === "created" || result === "signed-in") {
    return { kind: "provider", created: result === "created" };
  }

  const error = params.get("error");

  // Unknown codes still mean "it didn't work".
  if (error !== null && error.startsWith("oauth-")) {
    return { kind: "error", code: isProviderError(error) ? error : "oauth-failed" };
  }

  return null;
}
