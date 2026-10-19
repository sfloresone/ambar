# API reference

The contract is [`apps/api/openapi.yaml`](../../apps/api/openapi.yaml) (OpenAPI 3.1). It is the single source of truth: handlers are written to it, the Go contract test validates test responses against it, and clients derive their schemas from it.

Base URL: `https://api.ambar.page`. All endpoints under `/v1` are versioned by path; `/healthz` is not.

| Method and path | Operation | Purpose |
| --- | --- | --- |
| `GET /healthz` | `getHealth` | Liveness check |
| `POST /v1/auth/email` | `requestSignInCode` | Email a sign-in code and link |
| `POST /v1/auth/email/verify` | `verifySignIn` | Exchange a code or link token for a session |
| `GET /v1/auth/session` | `getSession` | Who is signed in |
| `DELETE /v1/auth/session` | `signOut` | End the session |

Conventions:

- Requests and responses are JSON. Errors are problem documents; see [errors.md](errors.md).
- Every response carries `X-Request-Id`; see [logs.md](logs.md).
- `/v1` responses are `Cache-Control: no-store` and require an allowed `Origin` from browsers.

Lint the file with `bun run lint:openapi`. Validate it against the OpenAPI schema and against the handlers with `bun run test:api`.
