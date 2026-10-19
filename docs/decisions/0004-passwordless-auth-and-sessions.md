# 0004. Passwordless sign-in with opaque server-side sessions

- Status: accepted
- Date: 2026-10-19 (records a decision taken earlier)

## Context

Ambar needs sign-in on the web now and on an extension, desktop and mobile later. Passwords add reset flows, breach risk and friction for a product whose first step is "drop a moment".

## Decision

- Sign-in is email only: the user asks for a code, receives a 6-digit code and a magic link, and verifies either one. Asking for a code never reveals whether an account exists; verification returns `created` so the UI can say "Welcome" or "Welcome back".
- Sessions are random opaque tokens stored hashed in PostgreSQL. The web receives it as an httpOnly, `SameSite=Lax`, host-only cookie (`__Host-` prefixed in production); native clients receive it in the response body and store it in the OS keychain or `chrome.storage.session`.
- Codes expire, have a fixed number of attempts and a per-email request rate limit; the limits are returned to the client (`attemptsLeft`, `retryAfterMs`) so the UI can show them.
- Browser routes under `/v1` require an allowed `Origin`, send `Cache-Control: no-store` and are protected by per-client rate limits.

## Consequences

- No password storage, reset or strength rules. Email delivery (Resend) is a hard dependency of sign-in; `503 network` is returned when it fails.
- Sessions can be revoked server-side at any time; sign-out deletes the row.
- Every surface reuses the same two endpoints; only where the token is stored differs.

## Options considered

- Passwords plus optional magic link: more code and more risk for no gain at this stage.
- Third-party identity (OAuth providers): adds an account requirement at the provider and a dependency on their consent screens; may be added later as another way to prove an email.
- JWT sessions: stateless, but cannot be revoked and leak claims into the client.
