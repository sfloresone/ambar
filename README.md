# Ambar

> A moment kept. Still there when you look.

Monorepo managed **exclusively with Bun** (no npm, pnpm or yarn). Project rules live in [AGENTS.md](AGENTS.md).

## Structure

| Path                     | What it is                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| `apps/web`               | Public site. Astro 7 + React islands + Tailwind v4 + Motion.               |
| `apps/app`               | Web app. Vite + React 19 + React Router + shadcn (Base UI, Maia style).    |
| `packages/ui`            | `@ambar/ui`: shadcn components, shared screens and the only global CSS.    |
| `packages/core`          | `@ambar/core`: UI-free logic and types (moments, auth, upload).            |
| `tools/oxlint/anti-slop` | Vendored [anti-slop](https://github.com/dmmulroy/anti-slop) lint rules.    |

Upcoming apps: `apps/api`, `apps/extension`, `apps/desktop`, `apps/mobile`. Packages are flat: no nested packages.

## Commands

```sh
bun install
bun run dev        # web (4321) + app (5173)
bun run dev:web
bun run dev:app
bun run build
bun run typecheck
bun run lint       # oxlint + anti-slop
bun run lint:fix
```

## Website build information

The footer shows the version from `apps/web/package.json` and, when available, the first seven
characters of the build commit. Set `BUILD_COMMIT` in the build environment to supply the deployed
revision; otherwise, the build reads it from Git. When no commit is available, only the version appears.

## shadcn components

Add them from `apps/app`; they land in `packages/ui`:

```sh
bunx --bun shadcn@latest add dialog -c apps/app
```

## Styles

Typography: Figtree (body, `font-sans`) and Averia Sans Libre 700 (headings, `font-heading`, applied to h1–h6 by default). Icons: Phosphor (`@phosphor-icons/react`); lucide is not used.

Everything is written with Tailwind utilities. `packages/ui/src/styles/globals.css` only holds tokens (`@theme`, shadcn variables, fonts) and is touched only when strictly necessary.
