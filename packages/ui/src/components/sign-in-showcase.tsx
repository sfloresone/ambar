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

const FRAMES = [frame01, frame02, frame03, frame04, frame05, frame06, frame07, frame08, frame09, frame10, frame11, frame12];

const PLAY_QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function canAnimate() {
  try {
    return typeof window !== "undefined" && window.matchMedia(PLAY_QUERY).matches && "addEventListener" in window.matchMedia(PLAY_QUERY) && !document.hidden;
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
  document.addEventListener("visibilitychange", callback);

  return () => {
    query.removeEventListener("change", callback);
    document.removeEventListener("visibilitychange", callback);
  };
}

/** Prepared images only: the sign-in surfaces never load Paper's shader or require a GPU context. */
export function SignInShowcase() {
  const container = useRef<HTMLDivElement>(null);
  const prepared = useRef<Promise<void> | null>(null);
  const [frame, setFrame] = useState(0);
  const allowed = useSyncExternalStore(subscribePlayback, canAnimate, () => false);

  useEffect(() => {
    if (!allowed || !("Image" in window)) {
      return;
    }

    let active = true;
    let loaded = false;
    let visible = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const sync = () => {
      clearInterval(timer);

      if (active && loaded && visible) {
        timer = setInterval(() => setFrame((current) => (current + 1) % FRAMES.length), 1000 / SIGN_IN_DITHER.fps);
      }
    };

    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    }) : null;

    if (container.current) {
      observer?.observe(container.current);
    }

    prepared.current ??= Promise.all(FRAMES.map((src) => {
      const image = new Image();

      return new Promise<void>((resolve, reject) => {
        image.onload = () => {
          if ("decode" in image) {
            image.decode().then(resolve, reject);
          } else {
            resolve();
          }
        };

        image.onerror = () => reject(new Error("A sign-in frame could not load."));
        image.src = src;
      });
    })).then(() => {});

    prepared.current.then(() => {
      loaded = true;
      sync();
    }).catch(() => {
      // Keep the first photo if any frame fails to load; never animate an incomplete sequence.
    });

    return () => {
      active = false;
      clearInterval(timer);
      observer?.disconnect();
    };
  }, [allowed]);

  return (
    <div ref={container} className="absolute inset-0" data-sign-in-frame={frame + 1}>
      <picture>
        <source media="(min-width: 768px)" srcSet={FRAMES[frame]} />
        <img src={EMPTY_IMAGE} alt="" aria-hidden width={600} height={800} decoding="sync" className="absolute inset-0 size-full object-cover" />
      </picture>
    </div>
  );
}
