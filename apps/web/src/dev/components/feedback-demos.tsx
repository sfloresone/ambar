import { Button } from "@ambar/ui/components/button";
import { ProgressBar } from "@ambar/ui/components/progress-bar";
import { SkeletonLines, SkeletonSwap } from "@ambar/ui/components/skeleton-swap";
import { useEffect, useState } from "react";

/** Reloads a card after a fast (80 ms: no skeleton at all) or slow (1.2 s) answer. */
export function SkeletonSwapDemo() {
  const [ready, setReady] = useState(true);

  function reload(ms: number) {
    setReady(false);
    window.setTimeout(() => setReady(true), ms);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex gap-2">
        <Button tone="cloud" size="sm" onClick={() => reload(80)}>
          Fast answer
        </Button>
        <Button tone="cloud" size="sm" onClick={() => reload(1200)}>
          Slow answer
        </Button>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <SkeletonSwap ready={ready} label="Note" skeleton={<SkeletonLines lines={3} />}>
          <p className="text-sm leading-[1.4]">
            Kept on a Tuesday, under the ash tree. The light came through the leaves the way it does in late
            October. Ambar read the sign in the corner.
          </p>
        </SkeletonSwap>
      </div>
    </div>
  );
}

/** An upload: unknown size first, then real progress, then done. Replay remounts it. */
export function ProgressBarDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Upload key={run} />
      <Button tone="cloud" size="sm" className="w-fit" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </div>
  );
}

function Upload() {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let current = 0;
    let timer = 0;

    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        current = Math.min(1, current + 0.08 + Math.random() * 0.08);
        setValue(current);

        if (current >= 1) {
          window.clearInterval(timer);
        }
      }, 220);
    }, 1200);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <ProgressBar value={value} label="Keeping sky-through-leaves.jpeg" completeLabel="Kept" />
      <ProgressBar value={value} label="Keeping sky-through-leaves.jpeg" size="sm" />
    </>
  );
}
