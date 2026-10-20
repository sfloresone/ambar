// Iris: the camera closing onto the mark, and opening from it. Used for the landing → app handoff:
// the landing closes it onto the dialog's logo, the app (which paints the closed, centered state before
// any JS) opens it. A full-screen ink layer with a circular hole; Motion animates the hole (--iris).
// Portable: no navigation inside, the caller decides what happens in onDone.
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { EASE } from "../lib/motion.ts";
import { cn } from "../lib/utils.ts";
import { wait } from "../lib/wait.ts";
import { Mark } from "./mark.tsx";

export type IrisState = "closing" | "opening";

/** Where the iris closes onto, in viewport pixels: usually a logo already on screen. */
export type IrisOrigin = {
  x: number;
  y: number;
  size: number;
};

/**
 * The handoff flag: an app opens the iris when it lands with ?entry=iris. The app's index.html reads the
 * same literal in an inline script (it runs before any module), keep them in sync.
 */
export const IRIS_ENTRY = { param: "entry", value: "iris" } as const;

export function isIrisEntry(params: URLSearchParams): boolean {
  return params.get(IRIS_ENTRY.param) === IRIS_ENTRY.value;
}

/** `href` with the handoff flag, for navigating to another app (another origin). */
export function withIrisEntry(href: string): string {
  const url = new URL(href, window.location.href);

  url.searchParams.set(IRIS_ENTRY.param, IRIS_ENTRY.value);

  return url.toString();
}

/** Where an on-screen element sits, as an iris origin. Falls back to the viewport center. */
export function irisOriginOf(element: HTMLElement | null): IrisOrigin {
  const rect = element?.getBoundingClientRect();

  return rect === undefined
    ? { x: window.innerWidth / 2, y: window.innerHeight / 2, size: 48 }
    : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: rect.width };
}

const CLOSE = { duration: 0.65, ease: EASE.iris } as const;

const OPEN = { duration: 0.7, ease: EASE.develop, delay: 0.15 } as const;

/** After closing onto the origin, the mark glides to the center, where the app's first frame has it. */
const TO_CENTER = { duration: 0.3, ease: EASE.develop } as const;

const HOLD_MS = 120;

/** Fully shut: at 0px the gradient still leaves a one-pixel see-through dot. */
const SHUT = "-2px";

/** Size of the mark at the center (size-24), as in the app's pre-JS cover. */
const CENTER_SIZE = 96;

type IrisProps = {
  state: IrisState;
  /** Closing only: close onto this point instead of the viewport center. */
  origin?: IrisOrigin;
  /** What the iris closes onto and carries to the center (a square). Defaults to the Ambar mark. */
  mark?: ReactNode;
  onDone?: () => void;
};

/** Distance from a point to the farthest viewport corner: the radius that leaves nothing covered. */
function radiusFrom(x: number, y: number) {
  return Math.max(Math.hypot(x, y), Math.hypot(window.innerWidth - x, y), Math.hypot(x, window.innerHeight - y), Math.hypot(window.innerWidth - x, window.innerHeight - y)) + 2;
}


export function Iris({ state, origin, mark: content = <Mark className="size-full" />, onDone }: IrisProps) {
  const hole = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const closing = state === "closing";
  const fromOrigin = closing && origin !== undefined;

  // Before the first paint: center the hole on the origin and put the mark exactly over it.
  const measure = useEffectEvent(() => {
    if (!fromOrigin || hole.current === null || mark.current === null) {
      return;
    }

    hole.current.style.setProperty("--iris-x", `${origin.x}px`);
    hole.current.style.setProperty("--iris-y", `${origin.y}px`);
    hole.current.style.setProperty("--iris", `${radiusFrom(origin.x, origin.y)}px`);

    const dx = origin.x - window.innerWidth / 2;
    const dy = origin.y - window.innerHeight / 2;

    mark.current.style.transform = `translate(${dx}px, ${dy}px) scale(${origin.size / CENTER_SIZE})`;
  });

  // Once, at mount: the iris is mounted for a single close or open.
  useLayoutEffect(() => measure(), []);

  // The latest onDone when the animation ends: the page may have re-rendered (e.g. changed route) meanwhile.
  const finish = useEffectEvent(() => onDone?.());

  const start = useEffectEvent(() => {
    if (hole.current === null || mark.current === null || reduceMotion) {
      finish();

      return;
    }

    const holeElement = hole.current;
    const markElement = mark.current;
    let cancelled = false;

    async function run() {
      if (closing) {
        const full = fromOrigin ? radiusFrom(origin.x, origin.y) : radiusFrom(window.innerWidth / 2, window.innerHeight / 2);

        await animate(holeElement, { "--iris": [`${full}px`, SHUT] }, CLOSE);

        if (fromOrigin) {
          await animate(markElement, { transform: [markElement.style.transform, "translate(0px, 0px) scale(1)"] }, TO_CENTER);
        }

        await wait(HOLD_MS);
      } else {
        const full = radiusFrom(window.innerWidth / 2, window.innerHeight / 2);

        // The mark steps back while the scene opens around it.
        void animate(markElement, { opacity: [1, 0], transform: ["scale(1)", "scale(1.15)"] }, { duration: 0.45, delay: OPEN.delay, ease: OPEN.ease });
        await animate(holeElement, { "--iris": [SHUT, `${full}px`] }, OPEN);
      }

      if (!cancelled) {
        finish();
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => start(), []);

  if (reduceMotion) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden
      data-slot="iris"
      data-state={state}
      // Closing blocks clicks while the scene ends; opening never gets in the way.
      className={cn("fixed inset-0 z-100", closing ? "pointer-events-auto" : "pointer-events-none")}
    >
      {/* Ink with the circular hole. Only this layer is masked, so the hole never cuts through the mark. */}
      <div
        ref={hole}
        className={cn(
          "absolute inset-0 bg-ink [--iris-x:50%] [--iris-y:50%] [mask-image:radial-gradient(circle_at_var(--iris-x)_var(--iris-y),transparent_var(--iris),black_calc(var(--iris)_+_1px))]",
          // Starting radius: wide open before closing, shut before opening.
          closing ? "[--iris:150vmax]" : "[--iris:-2px]",
        )}
      />
      {/* Centered at its final size; when closing from an origin it starts translated and scaled over the logo. */}
      <div ref={mark} className="absolute top-1/2 left-1/2 -mt-12 -ml-12 size-24 origin-center">
        {content}
      </div>
    </div>,
    document.body,
  );
}

type IrisExit = {
  logoRef: RefObject<HTMLDivElement | null>;
  close: () => void;
  iris: ReactNode;
};

/**
 * "Close the iris onto the logo, then leave": the flow renders <FlowLogo ref={logoRef} />, calls close()
 * when it is done, and renders `iris`. onClosed runs when the screen is fully shut (navigate there).
 */
export function useIrisExit(onClosed: () => void): IrisExit {
  const logoRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<IrisOrigin | null>(null);

  return {
    logoRef,
    close: () => setOrigin(irisOriginOf(logoRef.current)),
    iris: origin === null ? null : <Iris state="closing" origin={origin} onDone={onClosed} />,
  };
}
