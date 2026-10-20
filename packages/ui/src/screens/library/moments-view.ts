import { useLayoutEffect, useState, type RefObject } from "react";

import { readItem, writeItem } from "../../lib/storage.ts";

/** How Moments is laid out: grid density (2×2, 3×3, 4×4) or the list with its preview panel. */
export const MOMENTS_VIEWS = ["2", "3", "4", "list"] as const;

export type MomentsView = (typeof MOMENTS_VIEWS)[number];

/** Maximum density follows the space available to the shared screen. */
export const MOMENT_COLUMNS = {
  2: "grid-cols-1 @xl:grid-cols-2",
  3: "grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3",
  4: "grid-cols-1 @xl:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4",
} as const;

const KEY = "ambar.moments-view";

/** Use the screen's width, rather than the window's, in webviews and embedded surfaces too. */
export function useMomentsSplit(ref: RefObject<HTMLElement | null>): boolean {
  const [split, setSplit] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) return;

    const measure = () => setSplit(element.getBoundingClientRect().width >= 768);

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);

      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return split;
}

function isMomentsView(value: string | null): value is MomentsView {
  return MOMENTS_VIEWS.some((view) => view === value);
}

/** The chosen view, remembered on this device (each screen size has its own habits). */
export function useMomentsView() {
  const [view, setView] = useState<MomentsView>(() => {
    const saved = readItem(KEY);

    return isMomentsView(saved) ? saved : "4";
  });

  return {
    view,
    setView(next: string) {
      if (isMomentsView(next)) {
        setView(next);
        writeItem(KEY, next);
      }
    },
  };
}
