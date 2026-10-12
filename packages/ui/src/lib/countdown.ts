import { useEffect, useState } from "react";

/** Whole seconds until `target` (epoch ms), ticking every second; 0 once it has passed. */
export function useSecondsUntil(target: number): number {
  const [now, setNow] = useState(() => Date.now());

  // One timeout per tick, until the target passes.
  useEffect(() => {
    if (now >= target) {
      return;
    }

    const timer = setTimeout(() => setNow(Date.now()), 1000);

    return () => clearTimeout(timer);
  }, [now, target]);

  return Math.max(0, Math.ceil((target - now) / 1000));
}

/** "45s" under a minute, "42:07" above: how long to wait, for people. */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
