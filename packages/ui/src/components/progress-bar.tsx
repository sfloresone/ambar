// How far a task is, e.g. a moment uploading. Inspired by interior.dev's Progress Bar (behavior and
// accessibility, not its code): a native <progress> carries the semantics (indeterminate without a value),
// a drawn track carries the looks (a crawling segment until the first real progress), and completion is
// announced politely. CSS only, on our tokens: the recessed well of the tactile controls and a leaf fill
// that scales from the left (compositor only).
import { useId } from "react";

import { WELL } from "../lib/tactile.ts";
import { cn } from "../lib/utils.ts";

type ProgressBarProps = {
  /** 0 to 1; null while the size of the task isn't known yet (indeterminate). */
  value: number | null;
  /** What is progressing. Visible above the bar on md, for screen readers only on sm. */
  label: string;
  pendingLabel?: string;
  completeLabel?: string;
  size?: "sm" | "md";
  className?: string;
};

export function ProgressBar({ value, label, pendingLabel = "Starting", completeLabel = "Done", size = "md", className }: ProgressBarProps) {
  const labelId = useId();
  const percent = value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
  const valueText = percent === null ? pendingLabel : `${percent}%`;

  return (
    <div data-slot="progress-bar" className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-3 text-sm", size === "sm" && "sr-only")}>
        <span id={labelId} className="font-medium">
          {label}
        </span>
        <span aria-hidden className="text-muted-foreground tabular-nums">
          {valueText}
        </span>
      </div>
      {/* The real control for assistive tech; no value attribute = indeterminate. */}
      <progress aria-labelledby={labelId} aria-valuetext={valueText} max={100} value={percent ?? undefined} className="sr-only" />
      <div aria-hidden className={cn("relative overflow-hidden rounded-full", WELL, size === "sm" ? "h-1.5" : "h-2")}>
        {percent === null ? (
          // Still: a half fill, quiet, instead of the crawl.
          <span className="absolute inset-y-0 left-0 w-[35%] animate-crawl rounded-full bg-leaf motion-reduce:w-1/2 motion-reduce:animate-none motion-reduce:opacity-40" />
        ) : (
          <span
            className="absolute inset-0 origin-left rounded-full bg-leaf shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[scale] duration-300 ease-settle motion-reduce:transition-none"
            style={{ scale: `${percent / 100} 1` }}
          />
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {percent === 100 ? completeLabel : ""}
      </span>
    </div>
  );
}
