// Tactile surface shared by every Ambar control. Adapted from opensourceui (MIT, github.com/bidyut10/opensourceui).
// Subtle bevel: a 1px hairline, a 1-3px drop and a soft inner shade at the bottom. No long blurs.
import { cn } from "./utils.ts";

/** Raised key on a light fill (cloud, sky). */
export const RAISED_LIGHT =
  "shadow-[0_0_0_1px_rgb(20_20_20/0.07),0_1px_1px_rgb(20_20_20/0.1),0_2px_3px_rgb(20_20_20/0.08),inset_0_1px_0_rgb(255_255_255/0.6),inset_0_-2px_3px_rgb(20_20_20/0.07)]";

/** Raised key on a dark or saturated fill (ink, leaf, danger). */
export const RAISED_DARK =
  "shadow-[0_0_0_1px_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.16),0_2px_3px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.16),inset_0_-2px_3px_rgb(0_0_0/0.2)]";

/** Key pushed in, while held. Written out in full so Tailwind can see the class. */
export const PRESS_ACTIVE = "active:translate-y-px active:shadow-[0_0_0_1px_rgb(20_20_20/0.08),inset_0_1px_1px_rgb(20_20_20/0.1),inset_0_2px_3px_rgb(20_20_20/0.06)]";

/** Key latched in: pressed toggles and selected segments. */
export const PRESS_LATCHED = "data-pressed:translate-y-px data-pressed:shadow-[0_0_0_1px_rgb(20_20_20/0.08),inset_0_1px_1px_rgb(20_20_20/0.1),inset_0_2px_3px_rgb(20_20_20/0.06)]";

/** Raised key that appears when a segment is selected. */
export const SELECTED_RAISED = "data-pressed:shadow-[0_0_0_1px_rgb(20_20_20/0.07),0_1px_1px_rgb(20_20_20/0.1),0_2px_3px_rgb(20_20_20/0.08),inset_0_1px_0_rgb(255_255_255/0.6),inset_0_-2px_3px_rgb(20_20_20/0.07)]";

/** Recessed well that holds keys (segmented control, switch track). */
export const WELL =
  "bg-muted shadow-[inset_0_1px_2px_rgb(20_20_20/0.08),inset_0_-1px_0_rgb(255_255_255/0.5)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]";

/** Behavior every tactile control shares: focus, motion, disabled. */
export const TACTILE_BASE = cn(
  "inline-flex shrink-0 cursor-pointer items-center justify-center font-medium outline-hidden select-none",
  "transition-[filter,box-shadow,transform,background-color,color] duration-200 ease-tactile motion-reduce:transition-none",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:pointer-events-none disabled:opacity-40 data-disabled:pointer-events-none data-disabled:opacity-40",
);

export type TactileTone = "ink" | "cloud" | "sky" | "leaf" | "danger";

export const TONE: Record<TactileTone, string> = {
  // On a dark surface ink would vanish into the background; a 1px cloud edge keeps the key visible.
  ink: cn("bg-ink text-cloud hover:brightness-125 dark:bg-cloud dark:text-ink dark:hover:brightness-95", RAISED_DARK),
  cloud: cn("bg-cloud text-ink hover:brightness-[0.98] dark:bg-secondary dark:text-foreground dark:hover:brightness-110", RAISED_LIGHT),
  sky: cn("bg-sky text-ink hover:brightness-[1.04]", RAISED_LIGHT),
  leaf: cn("bg-leaf text-cloud hover:brightness-110", RAISED_DARK),
  danger: cn("bg-destructive text-cloud hover:brightness-110", RAISED_DARK),
};

