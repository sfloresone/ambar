import { useState } from "react";

import { readItem, writeItem } from "../../lib/storage.ts";

/** How Moments is laid out: grid density (2×2, 3×3, 4×4) or the list with its preview panel. */
export const MOMENTS_VIEWS = ["2", "3", "4", "list"] as const;

export type MomentsView = (typeof MOMENTS_VIEWS)[number];

const KEY = "ambar.moments-view";

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
