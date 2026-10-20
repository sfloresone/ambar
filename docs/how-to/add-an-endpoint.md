# Add an endpoint

1. Describe the operation in `apps/api/openapi.yaml`: path, `operationId`, request and response schemas, and the error codes it can return (reuse `Problem` and the shared responses). Run `bun run lint:openapi`.
2. Add any new error code to `docs/reference/errors.md` and to the `code` enum in the spec.
3. Write the handler in a `*_handlers.go` file (flat `package main`) and mount it in `routes.go`, inside the `authenticated` group unless it is meant for anyone (then add it to `publicRoutes` in `private_routes_test.go`, on purpose). Private handlers read the caller with `sessionFrom(r.Context())`. Use `writeJSON` and `writeProblem*`; never build error bodies by hand.
4. Log domain events with `slog.InfoContext(ctx, "…", "event", "area.event_name", …)` and add the row to `docs/reference/logs.md`. Never log emails, codes or tokens.
5. Add a test in `main_test.go` that exercises the handler through `newRouter`; `TestMain` validates every test response against the spec, so a handler that drifts from the contract fails the suite.
6. If clients use the endpoint, add the schema to `@ambar/core` and the call to the client in `@ambar/ui`.
7. Run `bun run test:api`, `bun run typecheck`, `bun run lint`.
