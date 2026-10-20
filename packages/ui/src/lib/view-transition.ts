// Moves the items of a list to their new places when a change reorders or filters them, with the
// browser's View Transitions: no animation library and no per-item measuring. Each `[data-moment-id]`
// is named only while the transition runs, so items cost nothing the rest of the time. Without the API,
// or with reduced motion, the change is instant. Resolves once the DOM shows the change. Timing lives in globals.css (`moment` class).
import { flushSync } from "react-dom";

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function moveInPlace(container: HTMLElement | null, update: () => void): Promise<void> {
  if (container === null || !("startViewTransition" in document) || reducedMotion()) {
    flushSync(update);

    return Promise.resolve();
  }

  // Named before the old snapshot and again after the update, so items that enter are named too.
  const name = () => {
    for (const item of container.querySelectorAll<HTMLElement>("[data-moment-id]")) {
      // Ids may start with a digit, which a view-transition-name can't.
      item.style.setProperty("view-transition-name", `m-${item.dataset.momentId}`);
      item.style.setProperty("view-transition-class", "moment");
    }
  };

  name();

  const transition = document.startViewTransition(() => {
    flushSync(update);
    name();
  });

  const unname = () => {
    for (const item of container.querySelectorAll<HTMLElement>("[data-moment-id]")) {
      item.style.removeProperty("view-transition-name");
      item.style.removeProperty("view-transition-class");
    }
  };

  // A skipped transition (tab hidden, another one started) rejects `finished`; the names go either way.
  transition.finished.then(unname, unname);

  return transition.updateCallbackDone;
}
