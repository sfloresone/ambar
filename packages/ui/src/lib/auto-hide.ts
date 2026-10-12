// Chrome that steps aside: a header (or any bar) that hides while the content is being used and comes back
// the moment it is wanted. Shared by the web app and, later, the desktop shell.
//
// - Scrolling down hides it; scrolling up, or being near the top of the page, shows it.
// - The pointer near the top edge shows it.
// - Keyboard focus inside it shows it and keeps it shown.
// - Idle mode (e.g. a canvas): it also hides after `idleMs` without being used. Moving around the content
//   does not bring it back (that would break the immersion); only the top edge, a key or focus do.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** How close to the top edge the pointer has to be to call the bar back, in px. */
const EDGE_PX = 72;

/** Ignore tiny scroll jitter. */
const SCROLL_SLACK_PX = 6;

type AutoHide = {
  hidden: boolean;
  /** The element that hides: focus inside it keeps it shown. */
  ref: RefObject<HTMLElement | null>;
};

export function useAutoHide({ idleMs }: { idleMs?: number } = {}): AutoHide {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const focusedInside = useCallback(() => ref.current?.contains(document.activeElement) === true, []);

  /** In idle mode: hide once it has been left alone for idleMs (never with focus inside). */
  const hideWhenIdle = useCallback(() => {
    clearTimeout(timer.current);

    if (idleMs !== undefined) {
      timer.current = setTimeout(function check() {
        if (focusedInside()) {
          timer.current = setTimeout(check, idleMs);
        } else {
          setHidden(true);
        }
      }, idleMs);
    }
  }, [focusedInside, idleMs]);

  const show = useCallback(() => {
    setHidden(false);
    hideWhenIdle();
  }, [hideWhenIdle]);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    function scroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;

        if (y < EDGE_PX || delta < -SCROLL_SLACK_PX) {
          show();
        } else if (delta > SCROLL_SLACK_PX && !focusedInside()) {
          clearTimeout(timer.current);
          setHidden(true);
        }

        if (Math.abs(delta) > SCROLL_SLACK_PX) {
          lastY = y;
        }
      });
    }

    function pointer(event: PointerEvent) {
      if (event.clientY <= EDGE_PX) {
        show();
      }
    }

    const element = ref.current;

    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("keydown", show);
    element?.addEventListener("focusin", show);
    hideWhenIdle();

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer.current);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("keydown", show);
      element?.removeEventListener("focusin", show);
    };
  }, [focusedInside, hideWhenIdle, show]);

  return { hidden, ref };
}
