// Library changes with the browser's View Transitions: no animation library and no per-item measuring.
// - moveInPlace: a filter or a grid density moves the same items; each shown `[data-moment-id]` on screen
//   glides to its new place (`moment` class).
// - swapInPlace: one view replaces another (grid ↔ list) with nothing to follow; the area cross-fades as
//   one piece (`moments-view`).
// Names exist only while a transition runs, so nothing costs anything the rest of the time. Images that
// arrive get a moment to decode, so nothing jumps once it ends. Without the API, or with reduced motion,
// the change is instant. Both resolve once the DOM shows the change. Timing lives in globals.css.
import { flushSync } from "react-dom";

import { wait } from "./wait.ts";

const ITEMS = "[data-moment-id]:not([hidden])";

/** Longest an arriving image may hold the change back; past it the change shows as it is. */
const IMAGE_BUDGET_MS = 200;

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

function inView(element: Element) {
  const rect = element.getBoundingClientRect();

  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function named(element: HTMLElement, name: string, group: string) {
  element.style.setProperty("view-transition-name", name);
  element.style.setProperty("view-transition-class", group);
}

function unnamed(element: HTMLElement) {
  element.style.removeProperty("view-transition-name");
  element.style.removeProperty("view-transition-class");
}

/** Named before the old snapshot and again after the update, so what arrives is named too. */
function run(container: HTMLElement | null, update: () => void, name: (area: HTMLElement) => void, unname: (area: HTMLElement) => void, images: string): Promise<void> {
  if (container === null || !("startViewTransition" in document) || reducedMotion()) {
    flushSync(update);

    return Promise.resolve();
  }

  name(container);

  const transition = document.startViewTransition(async () => {
    flushSync(update);
    name(container);

    const pending = [...container.querySelectorAll<HTMLImageElement>(images)].filter((image) => !image.complete && inView(image));

    if (pending.length > 0) {
      await Promise.race([Promise.allSettled(pending.map((image) => image.decode())), wait(IMAGE_BUDGET_MS)]);
    }
  });

  // A skipped transition (tab hidden, another one started) rejects `finished`; the names go either way.
  const clear = () => unname(container);

  transition.finished.then(clear, clear);

  return transition.updateCallbackDone;
}

export function moveInPlace(container: HTMLElement | null, update: () => void): Promise<void> {
  return run(
    container,
    update,
    (area) => {
      for (const item of area.querySelectorAll<HTMLElement>(ITEMS)) {
        // Ids may start with a digit, which a view-transition-name can't.
        if (inView(item)) named(item, `m-${item.dataset.momentId}`, "moment");
      }
    },
    (area) => {
      for (const item of area.querySelectorAll<HTMLElement>("[data-moment-id]")) unnamed(item);
    },
    `${ITEMS} img`,
  );
}

export function swapInPlace(container: HTMLElement | null, update: () => void): Promise<void> {
  return run(container, update, (area) => named(area, "moments-view", "moments-view"), unnamed, "img");
}
