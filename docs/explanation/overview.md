# How Ambar is put together

Ambar keeps a moment (a photo, a short clip, a link or a PDF) and leaves it visible afterwards on any device.

One Bun monorepo holds every surface:

- `apps/web`: the public site (Astro). It hosts the first "keep" and the sign-in dialog.
- `apps/app`: the web app (Vite + React Router): moments, collections, canvas, trash.
- `apps/api`: one Go binary (chi + PostgreSQL) behind `https://api.ambar.page`.
- `packages/core`: TypeScript with no DOM or React: contracts, validation, limits, platforms.
- `packages/ui`: React components shared by every surface that renders HTML.

The API is deliberately flat (`main.go`, `routes.go`, `*_handlers.go`, `middleware.go`, plus `auth/`, `mail/`, `migrations/`). Packages appear when code genuinely separates, not ahead of time.

Design references, used selectively: Google AIP for resource naming, standard methods, pagination and versioning; RFC 9457 for errors; OpenTelemetry for log and trace names; Diátaxis for these docs. See `docs/decisions/` for the choices and their reasons.
