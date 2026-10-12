import type { CollectionTone } from "@ambar/core";

/** A collection's folder color: background and the text that reads on it. One map for every surface. */
export const COLLECTION_TONE = {
  sky: "bg-sky text-ink",
  leaf: "bg-leaf text-cloud",
  ink: "bg-ink text-cloud",
  cloud: "bg-muted text-ink",
} as const satisfies Record<CollectionTone, string>;

/**
 * The folder's front cover as frosted glass in its color: see-through at the top (the prints show, blurred),
 * solid towards the bottom where the name sits, so it reads like the solid color.
 */
export const COLLECTION_GLASS = {
  sky: "bg-linear-to-b from-sky/20 via-sky/90 via-55% to-sky text-ink",
  leaf: "bg-linear-to-b from-leaf/25 via-leaf/90 via-55% to-leaf text-cloud",
  ink: "bg-linear-to-b from-ink/25 via-ink/90 via-55% to-ink text-cloud",
  cloud: "bg-linear-to-b from-muted/35 via-muted/90 via-55% to-muted text-ink",
} as const satisfies Record<CollectionTone, string>;
