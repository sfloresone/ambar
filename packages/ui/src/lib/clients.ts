// Auth and upload clients for the keep flow. Islands get a serializable `apiUrl`, not client objects,
// so the flow builds its clients here. With no API (today), a mock stands in behind the real contract.
import {
  AuthError,
  CODE_LENGTH,
  isValidEmail,
  momentKindOf,
  normalizeEmail,
  type AuthClient,
  type CodeRequest,
  type Moment,
  type MomentFile,
  type Session,
  type UploadClient,
  type UploadProgress,
} from "@ambar/core";

import { readItem, removeItem, writeItem } from "./storage.ts";
import { wait } from "./wait.ts";

/** The code the mock accepts. Only ever shown in mock mode. */
export const MOCK_CODE = "123456";

const MOCK_LATENCY_MS = 600;

const MOCK_UPLOAD_MS = 1800;

const RESEND_AFTER_MS = 30_000;

const SESSION_KEY = "ambar.session";

export type Clients = {
  auth: AuthClient;
  upload: UploadClient;
  /** True while there is no real API; the UI may show mock-only hints. */
  mock: boolean;
};


function readSession(): Session | null {
  const raw = readItem(SESSION_KEY);

  if (raw === null) {
    return null;
  }

  try {
    // SAFETY: only writeSession() writes this key, always with a serialized Session.
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (session === null) {
    removeItem(SESSION_KEY);
  } else {
    writeItem(SESSION_KEY, JSON.stringify(session));
  }
}

function sessionFor(email: string): Session {
  return {
    userId: `mock-${normalizeEmail(email)}`,
    email: normalizeEmail(email),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Token the mock puts in the "email link": the email, base64url-encoded. */
export function mockLinkToken(email: string): string {
  return btoa(normalizeEmail(email)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function emailFromMockToken(token: string): string | null {
  try {
    const email = atob(token.replaceAll("-", "+").replaceAll("_", "/"));

    return isValidEmail(email) ? email : null;
  } catch {
    return null;
  }
}

function createMockAuth(): AuthClient {
  return {
    async requestCode(email): Promise<CodeRequest> {
      await wait(MOCK_LATENCY_MS);

      if (!isValidEmail(email)) {
        throw new AuthError("invalid-email", "That doesn't look like an email address.");
      }

      return {
        email: normalizeEmail(email),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        resendAfterMs: RESEND_AFTER_MS,
      };
    },
    async verifyCode(email, code) {
      await wait(MOCK_LATENCY_MS);

      if (code.length !== CODE_LENGTH || code !== MOCK_CODE) {
        throw new AuthError("invalid-code", "That code didn't work. Try again or get a new one.");
      }

      const session = sessionFor(email);

      writeSession(session);

      return session;
    },
    async verifyLink(token) {
      await wait(MOCK_LATENCY_MS);

      const email = emailFromMockToken(token);

      if (email === null) {
        throw new AuthError("expired-code", "That link has expired. Request a new code.");
      }

      const session = sessionFor(email);

      writeSession(session);

      return session;
    },
    async signOut() {
      writeSession(null);
    },
    async getSession() {
      return readSession();
    },
  };
}

function createMockUpload(): UploadClient {
  return {
    async getUploadUrl() {
      return { uploadUrl: "mock://upload", expiresAt: new Date(Date.now() + 60_000).toISOString() };
    },
    async uploadMoment(file: MomentFile, session: Session, onProgress?: UploadProgress): Promise<Moment> {
      const steps = 12;

      for (let step = 1; step <= steps; step += 1) {
        await wait(MOCK_UPLOAD_MS / steps);
        onProgress?.(step / steps);
      }

      const base = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), sharedWith: [] };

      return momentKindOf(file) === "clip"
        ? { ...base, kind: "clip", mediaUrl: `mock://${session.userId}/${file.name}`, durationMs: 0 }
        : { ...base, kind: "photo", mediaUrl: `mock://${session.userId}/${file.name}`, width: 0, height: 0 };
    },
  };
}

export function createClients(apiUrl?: string): Clients {
  if (apiUrl !== undefined && apiUrl !== "") {
    // Real HTTP clients arrive with apps/api. Failing loudly beats silently using the mock in production.
    throw new Error(`API clients for ${apiUrl} are not implemented yet. Leave PUBLIC_API_URL unset to use the mock.`);
  }

  return { auth: createMockAuth(), upload: createMockUpload(), mock: true };
}
