// Hand-drawn marks on text: an underline or a strike, drawn like a pen stroke when `drawn` turns true (and
// on first paint if it already is). Adapted from opensourceui "Annotated Text" (MIT,
// github.com/bidyut10/opensourceui): kept the rough stroke; two marks instead of twelve, a draw-on
// animation, a filter id per instance (the original repeats ids in the DOM) and brand colors.
import { useEffect, useId, useState, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

const MARKS = {
  underline: { d: "M3,8 C38,4 92,3 137,6", box: "bottom-[-0.3em] left-[-2%] h-[0.45em] w-[104%]" },
  strike: { d: "M3,9 C44,7 96,5 137,3", box: "top-1/2 left-[-8%] h-[0.5em] w-[116%] -translate-y-1/2" },
} as const;

type AnnotationProps = {
  children: ReactNode;
  mark?: keyof typeof MARKS;
  /** Draw the mark (true) or hide it (false). Changing it draws or erases. */
  drawn?: boolean;
  /** Wait before drawing, to land after a related change (e.g. a price swap). */
  delayMs?: number;
  className?: string;
};

export function Annotation({ children, mark = "underline", drawn = true, delayMs = 0, className }: AnnotationProps) {
  const filterId = `rough-${useId().replaceAll(/[^\w-]/g, "")}`;
  const [painted, setPainted] = useState(false);
  const { d, box } = MARKS[mark];

  // Start undrawn for one frame, so a mark that is drawn from the start still animates in.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPainted(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span className={cn("relative inline-block whitespace-nowrap", className)}>
      {children}
      <svg aria-hidden viewBox="0 0 140 12" preserveAspectRatio="none" fill="none" className={cn("pointer-events-none absolute overflow-visible text-leaf", box)}>
        <defs>
          {/* A little turbulence makes the stroke read as drawn by hand, not by a ruler. */}
          <filter id={filterId} x="-10%" y="-100%" width="120%" height="300%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={4} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <path
          d={d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${filterId})`}
          style={{ transitionDelay: drawn ? `${delayMs}ms` : "0ms" }}
          className={cn(
            "[stroke-dasharray:1] transition-[stroke-dashoffset] duration-700 ease-out-soft motion-reduce:transition-none",
            drawn && painted ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]",
          )}
        />
      </svg>
    </span>
  );
}
