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

export type AuthErrorCode = "invalid-email" | "invalid-code" | "expired-code" | "rate-limited" | "network";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * Contract every platform's auth implementation must satisfy. Sign up and sign in are the same flow:
 * an unknown email creates the account when its code (or link) is verified.
 */
export interface AuthClient {
  requestCode(email: string): Promise<CodeRequest>;
  verifyCode(email: string, code: string): Promise<Session>;
  /** Verifies the token carried by the link in the same email. */
  verifyLink(token: string): Promise<Session>;
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
