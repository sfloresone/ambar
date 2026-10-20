import { useLayoutEffect, useRef, type ReactNode } from "react";

import { cn } from "../../lib/utils.ts";
import { MOMENT_COLUMNS } from "./moments-view.ts";

/** Pack in reading order, filling the shortest column. Ordinary grid is the fallback in older webviews. */
export function MomentGrid({ columns, label, children }: { columns: keyof typeof MOMENT_COLUMNS; label: string; children: ReactNode }) {
  const grid = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const element = grid.current;

    if (element === null || typeof ResizeObserver === "undefined") {
      return;
    }

    function measure(card: Element) {
      const item = card.parentElement;

      if (item === null) {
        return;
      }

      const gap = Number.parseFloat(getComputedStyle(item).paddingBottom) || 0;

      item.style.gridRowEnd = `span ${Math.ceil(card.getBoundingClientRect().height + gap)}`;
    }

    element.dataset.masonry = "true";

    const pending = new Set<Element>();
    let frame: number | undefined;

    // Write after the observer has finished delivering sizes, avoiding a resize loop in the same frame.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        pending.add(entry.target);
      }

      if (frame !== undefined) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = undefined;

        for (const card of pending) {
          measure(card);
        }

        pending.clear();
      });
    });

    for (const item of element.children) {
      const card = item.firstElementChild;

      if (card !== null) {
        measure(card);
        observer.observe(card);
      }
    }

    return () => {
      observer.disconnect();

      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [children, columns]);

  return (
    <ul ref={grid} aria-label={label} className={cn("grid items-start gap-x-5 @4xl:gap-x-6 data-[masonry=true]:auto-rows-[1px]", MOMENT_COLUMNS[columns])}>
      {children}
    </ul>
  );
}
