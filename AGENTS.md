# AGENTS.md

Ámbar keeps a moment (a photo, a short clip or a link) and leaves it visible afterwards, on any device, sharing only what the user chooses.

## Rules

1. **English only.** The repository and the product are in English: code, identifiers, comments, docs, commit messages, UI copy and metadata (`lang="en"`). Do not write Spanish (or any other language) unless the project owner explicitly asks for it for a specific page or text. Never translate on your own initiative.
2. **Bun only.** npm, pnpm, yarn and similar are forbidden. Install with `bun add` / `bun add -d`, run with `bun run` and `bunx --bun`. The only lockfile is `bun.lock`. After adding or removing a dependency, restart any running dev server: Vite serves stale optimized deps (504 "Outdated Optimize Dep") and islands silently stop hydrating.
3. **Everything in Tailwind.** Styles are written with Tailwind utilities. `packages/ui/src/styles/globals.css` is the only global CSS and is edited only when strictly necessary (`@theme` tokens, shadcn variables, fonts).
4. **No nested packages.** Every package lives directly under `apps/*` or `packages/*`. No `packages/ui/packages/...`.

## Structure

- `apps/web`: public site. Astro + React islands + Motion.
- `apps/app`: web app. Vite + React + React Router.
- `packages/ui` (`@ambar/ui`): shared components and screens (React).
- `packages/core` (`@ambar/core`): UI-free logic (session, upload URL, domain types). No React, no DOM.

Upcoming apps: `apps/api`, `apps/extension`, `apps/desktop`, `apps/mobile`. Reusable code goes in `packages/ui` or `packages/core` and is never duplicated across apps.

## Conventions

- **Components:** shadcn on Base UI (`base-maia`) for primitives like card, input and label. Add them with `bunx --bun shadcn@latest add <component> -c apps/app`; they land in `packages/ui`. Never `shadcn add button`: it would overwrite the tactile Button.
- **Buttons:** the tactile `Button` from `@ambar/ui/components/button` (tones `ink` main action, `leaf` confirm or save, `sky` share, `cloud` neutral, `danger` destroy; sizes `sm`, `md`, `lg`, `icon-sm`, `icon`, `icon-lg`; `loading`). Use `buttonVariants()` to style an `<a>`. Controls with their own behavior: `CopyButton`, `SaveToggle`, `SegmentedControl`, `Switch`, `HoldButton`. All share `@ambar/ui/lib/tactile`.
- **Focus:** Tailwind v4 `outline-none` and `outline-hidden` set the outline style to none, so `focus-visible:outline-2` alone draws nothing. Always pair it with `focus-visible:outline-solid`. Do not include `outline-color` in transitions.
- **Icons:** Phosphor (`@phosphor-icons/react`). Do not use lucide.
- **Typography:** Figtree for body text (`font-sans`), Averia Sans Libre 700 for headings (`font-heading`, applied to h1–h6).
- **Color:** primaries `ink` (black: text, primary button) and `cloud` (white: background, cards). Secondaries from the reference frames: `sky` (#93bbcb; fills and tints with ink text, never text) and `leaf` (#537234; text accents, links, focus, fills with cloud text). Grays come from the shadcn semantic tokens (cloud mixed toward ink). Never Tailwind default palettes and no new brand colors without the owner. Destructive red is functional only. Token names are English. Palette lives at `/dev/colors`.
- **Resin:** `resin` (#e09a2f) is the one exception to the palette and exists only for the amber specimen on the pricing section (`apps/web/src/components/amber-specimen.astro`). Never use it for text or UI.
- **Product terms:** OCR is called **readings** ("Ámbar reads the words in your photos so you can find them later"). Plans and limits live only in `apps/web/src/data/plans.ts`.
- **Animation:** CSS first (`tw-animate-css`, Tailwind transitions, always with `motion-reduce:`). Motion (`motion/react`) only when CSS cannot do it; on the landing it costs ~100 KB of JS per island.
- **Lint:** oxlint with the anti-slop rules vendored in `tools/oxlint/anti-slop`.

## Design system

- The gallery lives in `apps/web/src/dev` and is served at `/dev` only during `bun run dev:web`; it is never in the build. Add a section in `src/dev/sections.ts` plus `src/dev/pages/<slug>.astro`.
- Every specimen is shown on `cloud` and on `ink` (future dark mode).
- External components (e.g. opensourceui.in) enter as lab candidates in `apps/web/src/dev/lab`, then move to `packages/ui` once approved and the lab copy is deleted.
- When adapting one: keep the native element and its keyboard/ARIA behavior, swap lucide for Phosphor, replace default palettes and gray/black values with brand or semantic tokens, drop `forwardRef` and `"use client"`, import `cn` from `@ambar/ui/lib/utils`, and credit the source in a header comment.
- One button system: the tactile `Button`. New looks become tones of it; only components with their own behavior are separate.

## Before finishing

```sh
bun run typecheck
bun run lint
bun run build
```
