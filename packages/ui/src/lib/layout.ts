// The landing's frame, shared so the app (and later desktop/extension) feel like the same place.
// Class strings written out in full so Tailwind can see them.

/** Page content: same width and side padding as the landing. */
export const PAGE_FRAME = "mx-auto w-full max-w-5xl px-6";

/** Wrapper that keeps the pill floating at the top. */
export const PILL_HEADER_WRAP = "sticky top-3 z-40 px-3";

/**
 * Floating glass pill. backdrop-saturate lets photos underneath tint the glass (leaves, sky) like
 * looking through resin. Without backdrop-filter support the fill stays nearly opaque for contrast.
 * h-14 (56px) matters: the scroll-progress outline on the landing uses rx = ry = 28.
 */
export const PILL_HEADER =
  "relative mx-auto flex h-14 w-fit items-center gap-6 rounded-full border border-ink/5 bg-cloud/90 pr-2.5 pl-6 shadow-[0_0_0_1px_rgb(20_20_20/0.03),0_1px_2px_rgb(20_20_20/0.05),0_8px_24px_rgb(20_20_20/0.06),inset_0_1px_0_rgb(255_255_255/0.7)] supports-[backdrop-filter]:bg-cloud/65 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150";

export const PILL_BRAND =
  "mr-6 rounded-full font-heading text-xl font-bold tracking-tight text-foreground outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring";

export const PILL_LINK =
  "rounded-full px-3.5 py-1.5 text-muted-foreground outline-hidden transition-[color,background-color] duration-200 hover:bg-ink/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none aria-[current=page]:text-foreground";
