// Skeleton → content without a jump. Inspired by interior.dev's Skeleton Swap (behavior and accessibility,
// not its code): skeleton and content share one grid cell, so the box keeps its size; a short delay keeps
// fast loads from flashing a skeleton, and a minimum time keeps a shown skeleton from blinking away. CSS
// only (no Motion), on our tokens. Give the box its reserved size with className when the skeleton alone
// doesn't set it.
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

type SwapTiming = {
  /** A load faster than this never shows the skeleton. */
  delay?: number;
  /** Once shown, the skeleton stays at least this long. */
  minVisible?: number;
};

export type SwapPhase = "idle" | "skeleton" | "content";

export function useSkeletonSwap(ready: boolean, { delay = 120, minVisible = 380 }: SwapTiming = {}): SwapPhase {
  // When the skeleton appeared, and whether its minimum time has passed.
  const [shownAt, setShownAt] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [wasReady, setWasReady] = useState(ready);

  // A new load starts from idle, so it gets its own delay instead of reusing the last skeleton.
  if (ready !== wasReady) {
    setWasReady(ready);

    if (!ready) {
      setShownAt(null);
      setHeld(false);
    }
  }

  useEffect(() => {
    if (ready) {
      return;
    }

    const timer = setTimeout(() => {
      setShownAt(Date.now());
      setHeld(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [ready, delay]);

  useEffect(() => {
    if (shownAt === null) {
      return;
    }

    const timer = setTimeout(() => setHeld(false), minVisible);

    return () => clearTimeout(timer);
  }, [shownAt, minVisible]);

  if (ready && !held) {
    return "content";
  }

  return shownAt === null ? "idle" : "skeleton";
}

type SkeletonSwapProps = SwapTiming & {
  ready: boolean;
  /** What is loading, for screen readers: "Sign-in methods" → "Sign-in methods loaded". */
  label?: string;
  /** The placeholder, shaped like the content. Hidden from assistive tech. */
  skeleton: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SkeletonSwap({ ready, label, skeleton, className, children, ...timing }: SkeletonSwapProps) {
  const phase = useSkeletonSwap(ready, timing);

  return (
    <div data-slot="skeleton-swap" aria-busy={phase !== "content" || undefined} className={cn("grid", className)}>
      {phase !== "content" && (
        <div aria-hidden className={cn("col-start-1 row-start-1", phase === "idle" && "invisible")}>
          {skeleton}
        </div>
      )}
      {phase === "content" && (
        // Fades in where the skeleton was; reduced motion swaps at once.
        <div className="col-start-1 row-start-1 animate-in duration-300 ease-out-soft fade-in motion-reduce:animate-none">{children}</div>
      )}
      {label !== undefined && (
        <span aria-live="polite" className="sr-only">
          {phase === "content" ? `${label} loaded` : ""}
        </span>
      )}
    </div>
  );
}

/** A placeholder shape: a muted block that breathes (still with reduced motion). */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted motion-reduce:animate-none", className)} />;
}

// Varied but fixed widths, so lines look like text and never reshuffle between renders.
const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-5/6"];

/** Lines of text: the last one shorter, like the end of a paragraph. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock key={`line-${index}`} className={cn("h-2.5 rounded-full", index === lines - 1 && lines > 1 ? "w-[62%]" : LINE_WIDTHS[index % LINE_WIDTHS.length])} />
      ))}
    </div>
  );
}
