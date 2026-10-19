// The Ambar API's response shapes, decoded at the boundary: whatever comes over the network is checked
// against these before the app uses it. Shared by every client (web, extension, desktop, mobile).
import * as v from "valibot";

import type { CodeRequest, Session, SignedIn } from "./auth.ts";

export const SessionSchema = v.object({
  userId: v.string(),
  email: v.string(),
  expiresAt: v.string(),
}) satisfies v.GenericSchema<Session>;

export const CodeRequestSchema = v.object({
  email: v.string(),
  expiresAt: v.string(),
  resendAfterMs: v.number(),
}) satisfies v.GenericSchema<CodeRequest>;

export const SessionResponseSchema = v.object({ session: SessionSchema });

export const SignedInSchema = v.object({
  session: SessionSchema,
  created: v.boolean(),
}) satisfies v.GenericSchema<SignedIn>;

/**
 * Every API error is an RFC 9457 problem document (application/problem+json). `code` is the stable
 * identifier clients switch on; `detail` is end-user copy; `requestId` matches the X-Request-Id header.
 */
export const ProblemSchema = v.object({
  type: v.string(),
  title: v.string(),
  status: v.number(),
  detail: v.string(),
  code: v.string(),
  requestId: v.optional(v.string()),
  attemptsLeft: v.optional(v.number()),
  retryAfterMs: v.optional(v.number()),
});
