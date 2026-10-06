// Camera shutter: six slats (ink · leaf · sky) that cover a surface and lift top to bottom.
// Pure CSS transitions on `scale` (compositor only): no JS animation, no Motion dependency.
//
// Two ways to drive it:
// - `closed` (controlled): any section can close and open it, e.g. on scroll into view or as a "snap".
// - no `closed`: follows the nearest `group` ancestor's Base UI enter/exit states
//   (data-starting-style / data-ending-style), e.g. a Dialog.Popup with className "group".
// Place it inside a `relative` container; it covers it with `absolute inset-0`.
import { cn } from "../lib/utils.ts";

// Colors and delays written out in full so Tailwind can see every class.
const SLATS = [
  "bg-ink delay-0",
  "bg-leaf delay-[40ms]",
  "bg-sky delay-[80ms]",
  "bg-ink delay-[120ms]",
  "bg-leaf delay-[160ms]",
  "bg-sky delay-[200ms]",
];

/** Total time for the last slat to finish: 200 ms stagger + 650 ms transition. */
export const SHUTTER_OPEN_MS = 850;

type ShutterProps = {
  /** Controlled state. Leave undefined to follow a Base UI `group` ancestor. */
  closed?: boolean;
  className?: string;
};

export function Shutter({ closed, className }: ShutterProps) {
  const controlled = closed !== undefined;

  return (
    <div
      aria-hidden
      data-slot="shutter"
      data-closed={closed === true || undefined}
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[inherit] motion-reduce:hidden",
        className,
      )}
    >
      {SLATS.map((slat) => (
        <span
          key={slat}
          className={cn(
            slat,
            "flex-1 origin-top transition-transform duration-[650ms] ease-shutter",
            controlled
              ? closed
                ? "scale-y-100"
                : "scale-y-0"
              : "scale-y-0 group-data-starting-style:scale-y-100 group-data-ending-style:scale-y-100 group-data-ending-style:duration-[400ms]",
          )}
        />
      ))}
    </div>
  );
}
