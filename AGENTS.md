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

## Component philosophy

Shared components will run in very different places: the web, a desktop app, a browser extension and mobile. They must be well built, secure, frictionless and, above all, **portable**. That never means more code: if a component already meets these points, leave it as it is.

**Portability**
- `@ambar/core` is plain TypeScript: no DOM, no React, no platform APIs. Contracts, validation and domain rules that must run everywhere live here.
- `@ambar/ui` is React DOM and only uses standard web APIs (storage, IndexedDB, canvas, clipboard), which exist in browsers, desktop webviews and extension pages. Guard each one: it can be missing or blocked. A native mobile app reuses `@ambar/core`; `@ambar/ui` reaches mobile only through a webview.
- Platform decisions come in as props, never from inside a shared component: navigation (`onDone`), where tokens come from (`verifyToken`), which backend (`apiUrl`). Reading the URL, routing and `window.location` belong to the app or to an app-specific wrapper (e.g. the landing's `FirstMomentDialog` around the shared `KeepFlow`).
- Props that cross an Astro island boundary must be serializable: strings like `apiUrl`, never client objects or callbacks.

**Security**
- Client-side checks (file type and size, email shape, code length) exist for UX; the server is the authority and validates again.
- Real auth never keeps tokens in JS-readable storage: httpOnly cookies on the web, the OS keychain on desktop and mobile, `chrome.storage.session` in the extension. `localStorage` sessions exist only in the mock clients.
- One-time tokens leave the URL as soon as they are read (`history.replaceState` or a router replace).
- No `dangerouslySetInnerHTML`. External links open with `rel="noreferrer"`. User files are shown through `createMomentPreview` (decoded, resized, revoked), never as-is.

**Low friction**
- Native behavior before re-implementing it: real `<button>`, inputs with the right `type`, `inputMode` and `autocomplete` (`email`, `one-time-code`), so paste and autofill just work. One native input beats several synthetic ones (see `CodeInput`).
- Accessible primitives come from Base UI; keyboard, focus and ARIA must keep working after styling.
- Never lose the user's work or focus: keep focus on an error so they can retry, keep the dropped moment until it is uploaded, auto-submit when an input is complete, prefill what we already know.
- Check every component with the keyboard, axe (0 violations) and reduced motion.

**Simplicity**
- Add a dependency only when it removes more than it adds: complex or security-sensitive problems get a well-maintained library (e.g. react-dropzone); small, well-understood pieces (~100 lines) stay our own code (e.g. `CodeInput` instead of `input-otp`).
- No options, layers or abstractions "just in case".

## Conventions

- **Components:** shadcn on Base UI (`base-maia`) for primitives like card, input and label. Add them with `bunx --bun shadcn@latest add <component> -c apps/app`; they land in `packages/ui`. Never `shadcn add button`: it would overwrite the tactile Button.
- **Buttons:** the tactile `Button` from `@ambar/ui/components/button` (tones `ink` main action, `leaf` confirm or save, `sky` share, `cloud` neutral, `danger` destroy; sizes `sm`, `md`, `lg`, `icon-sm`, `icon`, `icon-lg`; `loading`). Use `buttonVariants()` to style an `<a>`. Controls with their own behavior: `CopyButton`, `SaveToggle`, `SegmentedControl`, `Switch`, `HoldButton`. All share `@ambar/ui/lib/tactile`.
- **Focus:** Tailwind v4 `outline-none` and `outline-hidden` set the outline style to none, so `focus-visible:outline-2` alone draws nothing. Always pair it with `focus-visible:outline-solid`. Do not include `outline-color` in transitions.
- **Icons:** Phosphor (`@phosphor-icons/react`). Do not use lucide.
- **Typography:** Figtree for body text (`font-sans`), Averia Sans Libre 700 for headings (`font-heading`, applied to h1–h6).
- **Color:** primaries `ink` (black: text, primary button) and `cloud` (white: background, cards). Secondaries from the reference frames: `sky` (#93bbcb; fills and tints with ink text, never text) and `leaf` (#537234; text accents, links, focus, fills with cloud text). Grays come from the shadcn semantic tokens (cloud mixed toward ink). Never Tailwind default palettes and no new brand colors without the owner. Destructive red is functional only. Token names are English. Palette lives at `/dev/colors`.
- **Resin:** `resin` (#e09a2f) is the one exception to the palette and exists only for the amber specimen on the pricing section (`apps/web/src/components/amber-specimen.astro`). Never use it for text or UI.
- **Product terms:** OCR is called **readings** ("Ámbar reads the words in your photos so you can find them later"). Plans and limits live only in `@ambar/core` (`plans.ts`); where Ámbar runs (web, extension, mobile, desktop, status and download URL) only in `@ambar/core` (`platforms.ts`), shared by the landing's Platforms section and the app's "Get Ámbar" menu.
- **Animation:** CSS first (`tw-animate-css`, Tailwind transitions, always with `motion-reduce:`). Motion (`motion/react`) only when CSS cannot do it; on the landing it costs ~100 KB of JS per island.
- **Signature motion:** two named effects. **Develop** (darkroom: from overexposed, flat and soft to sharp) is the onboarding of every "Start keeping" (`FirstMomentDialog`, always with `backdropSrc={onboardingBackdrop}` from `apps/web/src/lib/onboarding.ts`). **Shutter** (`@ambar/ui/components/shutter`, six ink · leaf · sky slats, pure CSS) is for other sections: `<Shutter closed={…} />` in a relative container. Both are replayable at `/dev/motion`. **Iris** (`@ambar/ui/components/iris`) is the landing → app handoff: the keep flow shows the mark centered at the top of the dialog from the email step; after "Kept." the iris closes onto that logo (`origin`), the mark glides to the center and the landing navigates with `?entry=iris`; the app's `index.html` paints that closed frame before any JS (inline script + critical CSS, the one place outside Tailwind; the mark is inlined as `<svg>` by a Vite plugin from `@ambar/ui/lib/mark-svg`, never an `<img>`) and `AppLayout` opens it once the first route renders, then strips the flag. Reduced motion skips it.
- **Frame:** every surface uses the landing's frame from `@ambar/ui/lib/layout` (`PAGE_FRAME`, `PILL_HEADER*`, `PILL_LINK`), so the app reads as the same place. Brand assets (the mark and its variants) live in `packages/ui/src/assets/logo`; its geometry in `@ambar/ui/lib/mark-paths`, drawn by the Astro `Mark` and the React `Mark` (`@ambar/ui/components/mark`). Draw the logo as inline SVG, never as an `<img>` that can fail to load.
- **Lazy UI:** preload heavy chunks on intent (pointerenter, focus, touchstart) and, once loaded, render the module directly instead of through `lazy`/Suspense, which holds the fallback ~300 ms even when the code is ready. Animate media only after it has loaded. Never display user photos at full resolution: use `createMomentPreview` (`@ambar/ui/lib/preview`).
- **Sign-in (keep flow):** one flow for sign up and sign in, `KeepFlow` in `@ambar/ui/screens/keep-flow/keep-flow`, used by the landing dialog (after the drop) and the app's `/login`. Email → 6-digit code (auto-submits) or the email link (`?verify=`, same origin, restores the pending moment from IndexedDB) → upload after verifying → into the app. The moment card stays in view on every step. Auth/upload contracts live in `@ambar/core`; `createClients(apiUrl)` in `@ambar/ui/lib/clients` returns mock clients while `PUBLIC_API_URL` / `VITE_API_URL` are unset (code `123456`, no emails) and refuses to run with a URL until real clients exist. Try it at `/dev/sign-in`.
- **Sign in never leaves the page:** the landing's "Sign in" opens `FirstMomentDialog mode="sign-in"` (same flow without the drop), and the app's `/login` renders the same `KeepFlow`. Both show `FlowLogo` on top and end the same way: the iris closes onto it (`irisOriginOf`) and opens on the moments (`?entry=iris`, across origins from the landing, in-app from `/login`). Without a moment the flow is one narrow column; the dialog widens only when there is a moment card.
- **Menus:** Base UI `Menu` dressed by `@ambar/ui/components/menu` (`MenuRoot`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuLinkItem`, `MenuGroupLabel`, `MenuSeparator`): the header pill's glass surface, keyboard and focus from Base UI. Pass `container` (the landmark the trigger lives in, e.g. the header) so the open menu stays inside a landmark. Ready-made: `UserMenu` (account, Settings, Sign out) and `GetAmbarMenu` (other platforms; disabled with their status until they have a `downloadUrl`).
- **Session in the app:** `useSession(apiUrl)` (`@ambar/ui/lib/session`) in `AppLayout`, re-read on route change; routes read it with `useAppSession()`. Signed in, the header shows `UserMenu` · sections · `GetAmbarMenu`; signed out, "Sign in". Nothing renders in that slot while it loads.
- **Lint:** oxlint with the anti-slop rules vendored in `tools/oxlint/anti-slop`, plus the `react` (hooks) and `jsx-a11y` plugins. For "run once, read the latest values" effects use `useEffectEvent`, never an `exhaustive-deps` disable. Every remaining `oxlint-disable` carries its reason after `--`.
- **Motion tokens:** easing lives in one place. Motion (JS) uses `EASE` from `@ambar/ui/lib/motion` (`develop`, `outSoft`, `iris`) and the develop filters; CSS uses the theme tokens `ease-out-soft`, `ease-settle`, `ease-tactile`, `ease-spring`, `ease-shutter` (globals.css). Never inline an easing array or `cubic-bezier(...)`.
- **Shared helpers:** `wait` (`lib/wait`), guarded `localStorage` (`lib/storage`: `readItem/writeItem/removeItem`), the iris handoff contract (`IRIS_ENTRY`, `isIrisEntry`, `withIrisEntry`) and `useIrisExit` (logo ref + close + closing iris) in `@ambar/ui/components/iris`. Reuse them instead of re-writing the pattern.

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
