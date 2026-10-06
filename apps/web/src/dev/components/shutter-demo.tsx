import { Button } from "@ambar/ui/components/button";
import { SHUTTER_OPEN_MS, Shutter } from "@ambar/ui/components/shutter";
import { useEffect, useRef, useState } from "react";

/** Controlled Shutter over a sample card: close, open, or snap (close then open). */
export function ShutterDemo() {
  const [closed, setClosed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  function snap() {
    setClosed(true);

    if (timer.current !== null) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => setClosed(false), SHUTTER_OPEN_MS);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl border bg-card">
        <p className="font-heading text-2xl font-bold">A moment kept.</p>
        <Shutter closed={closed} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button tone="cloud" size="sm" onClick={() => setClosed(true)}>
          Close
        </Button>
        <Button tone="cloud" size="sm" onClick={() => setClosed(false)}>
          Open
        </Button>
        <Button size="sm" onClick={snap}>
          Snap
        </Button>
      </div>
    </div>
  );
}
