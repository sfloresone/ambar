# Environment variables

Read by `apps/api/main.go` at startup; `.env.local` next to it overrides them in development (ignored by Git). `apps/api/.env.example` is the commented template. Defaults work for development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADDR` | `127.0.0.1:8080` | Listen address. Behind a reverse proxy keep it on localhost |
| `DATABASE_URL` | the `compose.yaml` database | PostgreSQL DSN |
| `APP_URL` | `http://localhost:5173` | The app that receives sign-in links. An `https` URL means production: `AUTH_SECRET`, `RESEND_API_KEY` and `MAIL_FROM` become required and the cookie becomes `__Host-session` |
| `ALLOWED_ORIGINS` | `http://localhost:4321,http://localhost:5173` | Browser origins allowed to call `/v1` and to be used as `returnTo` |
| `AUTH_SECRET` | random per run in development | Keys the code and token hashes; 32+ random characters |
| `RESEND_API_KEY` | unset | Email provider. Unset: sign-in emails are printed to the console |
| `MAIL_FROM` | `Ambar <hello@ambar.page>` | Sender |
| `TRUST_PROXY` | `false` | `true` only when the API is reachable solely through our reverse proxy, which sets `X-Real-IP` |
| `LOG_FORMAT` | `text` | `json` for the log collector on the VPS |

Keep this table and `.env.example` in step with `main.go`.
