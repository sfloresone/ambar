export type Session = {
  userId: string;
  email: string;
  expiresAt: string;
};

/** Length of the one-time code sent by email. */
export const CODE_LENGTH = 6;

export type CodeRequest = {
  email: string;
  /** When the code stops working. */
  expiresAt: string;
  /** How long to wait before another code can be requested. */
  resendAfterMs: number;
};

/** Accounts elsewhere that can sign in to Ambar. The API lists the ones it has configured. */
export type Provider = "google" | "github";

export const PROVIDERS = ["google", "github"] as const satisfies readonly Provider[];

/** Errors a provider sign-in comes back with (?error=…), see docs/reference/errors.md. */
export type ProviderErrorCode = "oauth-cancelled" | "oauth-state" | "oauth-email" | "oauth-failed" | "oauth-taken";

/** A provider account connected as a sign-in method (Settings). */
export type Identity = {
  provider: Provider;
  /** The verified address it had when it was connected. */
  email: string;
  linkedAt: string;
};

/**
 * invalid-code: wrong code, more tries left. too-many-attempts: the code is burned, a new email is needed.
 * expired-code: expired or already used. rate-limited: wait retryAfterMs. oauth-*: a provider sign-in failed.
 */
export type AuthErrorCode = "invalid-email" | "invalid-code" | "too-many-attempts" | "expired-code" | "rate-limited" | "network" | ProviderErrorCode;

/** What a client needs to guide the user after an error. */
export type AuthErrorDetails = {
  /** invalid-code: tries left before the code is burned. */
  attemptsLeft?: number;
  /** rate-limited: how long until another request is allowed. */
  retryAfterMs?: number;
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly attemptsLeft?: number;
  readonly retryAfterMs?: number;

  constructor(code: AuthErrorCode, message: string, details: AuthErrorDetails = {}) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.attemptsLeft = details.attemptsLeft;
    this.retryAfterMs = details.retryAfterMs;
  }
}

/** A successful sign-in. created: it also created the account (sign up), so the client can welcome them. */
export type SignedIn = {
  session: Session;
  created: boolean;
};

export type RequestCodeOptions = {
  /** The page the email link opens: where the flow started, so it finds what the user attached there. */
  returnTo?: string;
};

/**
 * Contract every platform's auth implementation must satisfy. Sign up and sign in share the backend flow
 * (asking for a code never reveals whether an account exists); verifying says whether it was created.
 */
export interface AuthClient {
  requestCode(email: string, options?: RequestCodeOptions): Promise<CodeRequest>;
  verifyCode(email: string, code: string): Promise<SignedIn>;
  /** Verifies the token carried by the link in the same email. */
  verifyLink(token: string): Promise<SignedIn>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  /** The providers that can sign in here; empty when none (or when the API can't be reached). */
  providers(): Promise<Provider[]>;
  /**
   * Where to send the browser to sign in with a provider, asked when the person chooses it. It comes back
   * to returnTo with the result (readAuthReturn). The caller navigates there (top-level: the provider's
   * consent page can't be framed or fetched). intent "link" connects it to the signed-in account instead
   * (Settings), and comes back with ?oauth=linked.
   */
  startProviderSignIn(provider: Provider, options: { returnTo: string; intent?: "link" }): Promise<string>;
  /** The provider accounts connected to the signed-in account. */
  identities(): Promise<Identity[]>;
  /** Removes one. Email codes keep working, so this never locks anyone out. */
  disconnect(provider: Provider): Promise<void>;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately loose: the code email is the real check.
const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return PLAUSIBLE_EMAIL.test(normalizeEmail(email));
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && /^\d+$/.test(code);
}
