# API design

Rules that every endpoint follows. They are enforced by the OpenAPI contract test where possible and by review otherwise.

- **Design first.** Write the operation in `apps/api/openapi.yaml`, then the handler. The spec is reviewed like code.
- **Resources, not verbs.** Paths name resources (`/v1/moments/{id}`, `/v1/auth/session`); HTTP methods carry the action (Google AIP-121/131–135). A custom action that does not fit a method uses a sub-resource or a `:verb` suffix (AIP-136), never a new top-level verb path.
- **Versioned by path.** `/v1` changes only in compatible ways (AIP-180): add fields and endpoints, never remove or retype. Breaking changes go to `/v2`.
- **JSON in, JSON out.** `camelCase` members. Timestamps are RFC 3339 UTC strings. IDs are opaque strings.
- **Errors are problem documents.** See [reference/errors.md](../reference/errors.md). Handlers never invent an ad hoc error shape.
- **Limits are visible.** When the server refuses because of a limit, the response says how much is left or how long to wait.
- **Private by default.** Anything that reads or changes an account's data is mounted in the `authenticated` group in `routes.go`: the middleware answers 401 before the handler runs, and the handler reads the caller with `sessionFrom`. `TestPrivateByDefault` fails for any route outside the group that isn't on its short public list. Front-end route guards are only UX; the API is what protects data.
- **Never leak.** No internal error text, stack traces or SQL in responses. The request ID is the pointer to the log.
- **Lists**, when they arrive, paginate with `pageSize` and an opaque `pageToken` (AIP-158) and filter with a `filter` string (AIP-160). Deletion of user content is soft (Trash) with a restore path (AIP-164).

How to add an endpoint: [how-to/add-an-endpoint.md](../how-to/add-an-endpoint.md).
