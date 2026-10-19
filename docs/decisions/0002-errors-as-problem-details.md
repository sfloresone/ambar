# 0002. API errors are RFC 9457 problem details

- Status: accepted
- Date: 2026-10-19

## Context

The API returned errors as `{"error": {"code", "message", …}}`, a shape only Ambar's own clients knew. Every new client (extension, mobile, third-party, an AI agent) would need to learn it, and generic tooling (OpenAPI validators, HTTP libraries, gateways) could not recognize it.

## Decision

Every error response is a problem document ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)) with `Content-Type: application/problem+json`:

```json
{
  "type": "https://docs.ambar.page/errors/invalid-code",
  "title": "Invalid code",
  "status": 400,
  "detail": "That code didn't work.",
  "code": "invalid-code",
  "attemptsLeft": 2,
  "requestId": "ambar-api/Kf3n2m0001"
}
```

- `type`, `title`, `status` and `detail` are the standard members.
- `code` is a stable, kebab-case identifier that clients switch on. It is the last path segment of `type`.
- `requestId` is the server's request ID (also in the `X-Request-Id` header), so a user can quote an error and we can find the log line.
- Extensions (`attemptsLeft`, `retryAfterMs`) are plain top-level members.
- `detail` is written for end users and may be shown as-is. It never contains internal error text.

## Consequences

- Clients parse one well-known shape. `@ambar/core` exports `ProblemSchema`; `@ambar/ui` maps `code` to `AuthErrorCode`.
- The catalog of codes lives in `docs/reference/errors.md` and in `openapi.yaml`; adding a code means updating both.
- Response bodies grow by a few bytes per error.

## Options considered

- Keep the custom envelope: no work now, more work for every future client.
- Google AIP-193 / `google.rpc.Status`: designed for gRPC; the numeric `code` and `details` any-types do not fit a JSON-only API.
