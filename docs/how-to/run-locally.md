# Run the project locally

1. Install Bun and Go (the version in `apps/api/go.mod`). Docker is needed for PostgreSQL.
2. `bun install` at the root.
3. API: `bun run --filter @ambar/api db:up` starts PostgreSQL; `bun run dev:api` runs migrations and serves on `:8080`. Copy `apps/api/.env.example` to `apps/api/.env` first. Variables: [reference/environment.md](../reference/environment.md).
4. Web and app: `bun run dev` (landing) or `bun run --filter @ambar/app dev`. Set `PUBLIC_API_URL` / `VITE_API_URL` to `http://localhost:8080` to use the real API instead of the mock client.
5. Before a pull request: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run test:api`, `bun run lint:openapi`.
