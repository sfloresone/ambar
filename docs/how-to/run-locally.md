# Run the project locally

1. Install Bun and Go (the version in `apps/api/go.mod`). Docker is needed for PostgreSQL.
2. `bun install` at the root.
3. API: copy `apps/api/.env.example` to `apps/api/.env.local` (required; there are no built-in defaults). `bun run --filter @ambar/api db:up` starts PostgreSQL; `bun run dev:api` runs migrations and serves on the `ADDR` you set. Variables: [reference/environment.md](../reference/environment.md). Go tests also read `.env.local`'s `DATABASE_URL`; `go test -short` skips the database.
4. Web and app: `bun run dev` (landing) or `bun run --filter @ambar/app dev`. Set `PUBLIC_API_URL` / `VITE_API_URL` to `http://localhost:8080` to use the real API instead of the mock client.
5. Before a pull request: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run test:api`, `bun run lint:openapi`.
