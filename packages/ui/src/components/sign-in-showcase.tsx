import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import frame01 from "../assets/sign-in-sequence/frame-01.webp?url";
import frame02 from "../assets/sign-in-sequence/frame-02.webp?url";
import frame03 from "../assets/sign-in-sequence/frame-03.webp?url";
import frame04 from "../assets/sign-in-sequence/frame-04.webp?url";
import frame05 from "../assets/sign-in-sequence/frame-05.webp?url";
import frame06 from "../assets/sign-in-sequence/frame-06.webp?url";
import frame07 from "../assets/sign-in-sequence/frame-07.webp?url";
import frame08 from "../assets/sign-in-sequence/frame-08.webp?url";
import frame09 from "../assets/sign-in-sequence/frame-09.webp?url";
import frame10 from "../assets/sign-in-sequence/frame-10.webp?url";
import frame11 from "../assets/sign-in-sequence/frame-11.webp?url";
import frame12 from "../assets/sign-in-sequence/frame-12.webp?url";
import { SIGN_IN_DITHER } from "../lib/sign-in-dither.ts";
import { cn } from "../lib/utils.ts";

const FRAMES = [frame01, frame02, frame03, frame04, frame05, frame06, frame07, frame08, frame09, frame10, frame11, frame12];

const FRAME_MS = 1000 / SIGN_IN_DITHER.fps;

const PLAY_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function canAnimate() {
  try {
    return typeof window !== "undefined" && window.matchMedia(PLAY_QUERY).matches;
  } catch {
    return false;
  }
}

function subscribePlayback(callback: () => void) {
  let query: MediaQueryList;

  try {
    query = window.matchMedia(PLAY_QUERY);
  } catch {
    return () => {};
  }

  if (!("addEventListener" in query)) {
    return () => {};
  }

  query.addEventListener("change", callback);

  return () => query.removeEventListener("change", callback);
}

/**
 * Prepared images only: the sign-in surfaces never load Paper's shader or require a GPU context.
 * Every frame is an <img> stacked over the first, requested and decoded once; a CSS loop steps their
 * opacity, so playing costs no request, no React render and no main-thread work per frame. Hidden tabs
 * stop it (the browser), offscreen pauses it, and it starts only once the whole sequence has decoded.
 */
export function SignInShowcase() {
  const container = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const allowed = useSyncExternalStore(subscribePlayback, canAnimate, () => false);

  useEffect(() => {
    const element = container.current;

    if (!allowed || element === null) {
      return;
    }

    let active = true;
    let loaded = false;
    let visible = true;

    const sync = () => setPlaying(active && loaded && visible);

    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    }) : null;

    observer?.observe(element);

    // decode() waits for the load too; never animate an incomplete sequence (a failed frame keeps the first photo).
    void Promise.all([...element.querySelectorAll<HTMLImageElement>("img[data-frame]")].map((image) => image.decode())).then(() => {
      loaded = true;
      sync();
    }, () => {});

    return () => {
      active = false;
      observer?.disconnect();
      setPlaying(false);
    };
  }, [allowed]);

  return (
    <div ref={container} className="absolute inset-0">
      <picture>
        <source media="(min-width: 768px)" srcSet={FRAMES[0]} />
        <img src={EMPTY_IMAGE} alt="" aria-hidden width={600} height={800} decoding="sync" className="absolute inset-0 size-full object-cover" />
      </picture>
      {/* Frames 2–12 over the first: md and up with motion only, so phones and reduced motion never download them. */}
      {allowed &&
        FRAMES.slice(1).map((src, index) => (
          <img
            key={src}
            data-frame
            src={src}
            alt=""
            aria-hidden
            width={600}
            height={800}
            className={cn(
              "absolute inset-0 size-full animate-sequence-frame object-cover opacity-0",
              playing ? "[animation-play-state:running]" : "[animation-play-state:paused]",
            )}
            // The loop's timing comes from the saved fps: frame n shows during its own slot of each loop.
            style={{ animationDuration: `${FRAMES.length * FRAME_MS}ms`, animationDelay: `${(index + 1) * FRAME_MS}ms` }}
          />
        ))}
    </div>
  );
}
