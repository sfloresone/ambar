import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export const STORY_DURATION = 4000;

function motionAllowed() {
  try {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches
    );
  } catch {
    return false;
  }
}

function subscribeMotion(callback: () => void) {
  try {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference)");

    query.addEventListener("change", callback);

    return () => query.removeEventListener("change", callback);
  } catch {
    return () => {};
  }
}

function tabVisible() {
  return typeof document === "undefined" || !document.hidden;
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);

  return () => document.removeEventListener("visibilitychange", callback);
}

export function useHeroEnvironment() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const motion = useSyncExternalStore(
    subscribeMotion,
    motionAllowed,
    () => false,
  );

  const tab = useSyncExternalStore(subscribeVisibility, tabVisible, () => true);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      // oxlint-disable-next-line react/set-state-in-effect -- the browser has no visibility observer; use its static fallback.
      setVisible(true);

      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.15 },
    );

    if (container.current) {
      observer.observe(container.current);
    }

    return () => observer.disconnect();
  }, []);

  return { container, motion, active: motion && tab && visible };
}

/** One finite clock, retained across visibility pauses and reset by the latest selection. */
export function useHeroPlayback(
  request: string,
  ready: boolean,
  active: boolean,
) {
  const elapsed = useRef(STORY_DURATION);
  const previousRequest = useRef<string | null>(null);
  const [time, setTime] = useState(STORY_DURATION);

  useEffect(() => {
    if (!ready || !active) {
      return;
    }

    if (previousRequest.current !== request) {
      previousRequest.current = request;
      elapsed.current = 0;
    }

    if (elapsed.current >= STORY_DURATION) {
      return;
    }

    let animation = 0;
    let previous = performance.now();
    let painted = 0;

    const tick = (now: number) => {
      elapsed.current = Math.min(
        STORY_DURATION,
        elapsed.current + now - previous,
      );
      previous = now;

      // Shader updates stay at 30fps; transforms interpolate independently in CSS.
      if (now - painted >= 1000 / 30 || elapsed.current === STORY_DURATION) {
        setTime(elapsed.current);
        painted = now;
      }

      if (elapsed.current < STORY_DURATION) {
        animation = requestAnimationFrame(tick);
      }
    };

    animation = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animation);
  }, [request, ready, active]);

  return time;
}

export function supportsHeroShader() {
  try {
    const context = document.createElement("canvas").getContext("webgl2");

    context?.getExtension("WEBGL_lose_context")?.loseContext();

    return context !== null;
  } catch {
    return false;
  }
}

export function decodeHeroImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if ("decode" in image) {
        image.decode().then(() => resolve(image), reject);
      } else {
        resolve(image);
      }
    };

    image.onerror = () => reject(new Error("The hero image could not load."));
    image.src = src;
  });
}
