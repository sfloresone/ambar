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

/**
 * invalid-code: wrong code, more tries left. too-many-attempts: the code is burned, a new email is needed.
 * expired-code: expired or already used. rate-limited: wait retryAfterMs.
 */
export type AuthErrorCode = "invalid-email" | "invalid-code" | "too-many-attempts" | "expired-code" | "rate-limited" | "network";

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
