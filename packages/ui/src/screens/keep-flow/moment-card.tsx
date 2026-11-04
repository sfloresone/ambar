// The user's moment, a compact row on every step of the keep flow, with a status line that tells the story:
// Ready to keep → Waiting for you → Keeping… 64% → Kept.
import { CheckIcon, ImageBrokenIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { ProgressBar } from "../../components/progress-bar.tsx";
import { DEVELOP_FROM, DEVELOP_TO, EASE } from "../../lib/motion.ts";
import { createMomentPreview, revokeMomentPreview, type MomentPreview } from "../../lib/preview.ts";
import { cn } from "../../lib/utils.ts";

export type MomentStatus = "ready" | "waiting" | "keeping" | "kept" | "failed";

type MomentCardProps = {
  file: File;
  status: MomentStatus;
  /** Upload progress, 0 to 1, while keeping. */
  progress?: number;
};

const STATUS_TEXT: Record<MomentStatus, string> = {
  ready: "Ready to keep",
  waiting: "Waiting for you",
  keeping: "Keeping…",
  kept: "Kept",
  failed: "Couldn't keep it yet",
};

export function MomentCard({ file, status, progress = 0 }: MomentCardProps) {
  const preview = useMomentPreview(file);

  return (
    <figure
      data-slot="moment-card"
      data-status={status}
      className="flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-2.5 pr-4"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        {preview !== null && <PreviewMedia preview={preview} name={file.name} />}
      </div>
      <figcaption className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{file.name}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <StatusIcon status={status} />
          {/* Live for the steps only; the percent is the progress bar's (announcing every tick would be noise). */}
          <span aria-live="polite">{STATUS_TEXT[status]}</span>
          {status === "keeping" && progress > 0 && (
            <span aria-hidden className="tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          )}
        </span>
        {status === "keeping" && <ProgressBar size="sm" label={`Keeping ${file.name}`} value={progress > 0 ? progress : null} completeLabel="Kept" className="mt-1" />}
      </figcaption>
    </figure>
  );
}

function StatusIcon({ status }: { status: MomentStatus }) {
  if (status === "kept") {
    return <CheckIcon weight="bold" aria-hidden className="size-4 text-link" />;
  }

  if (status === "failed") {
    return <WarningCircleIcon weight="bold" aria-hidden className="size-4 text-destructive" />;
  }

  // A small dot: leaf when it's moving, muted while it waits.
  return (
    <span
      aria-hidden
      className={cn("size-2 rounded-full", status === "keeping" ? "animate-pulse bg-leaf motion-reduce:animate-none" : "bg-sky")}
    />
  );
}

/** Display-sized preview of the file (see lib/preview.ts), revoked when the file changes or unmounts. */
function useMomentPreview(file: File): MomentPreview | null {
  // The preview remembers which file it belongs to, so a new file shows nothing until its own is ready.
  const [ready, setReady] = useState<{ file: File; preview: MomentPreview } | null>(null);

  useEffect(() => {
    let current: MomentPreview | null = null;
    let cancelled = false;

    void createMomentPreview(file).then((result) => {
      if (cancelled) {
        revokeMomentPreview(result);

        return;
      }

      current = result;
      setReady({ file, preview: result });
    });

    return () => {
      cancelled = true;

      if (current !== null) {
        revokeMomentPreview(current);
      }
    };
  }, [file]);

  return ready !== null && ready.file === file ? ready.preview : null;
}

type PreviewMediaProps = {
  preview: MomentPreview;
  name: string;
};

function PreviewMedia({ preview, name }: PreviewMediaProps) {
  const reduceMotion = useReducedMotion() === true;
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  if (preview.kind === "unsupported" || broken) {
    return (
      <div className="grid size-full place-items-center" title="This browser can't show a preview of it.">
        <ImageBrokenIcon weight="bold" aria-hidden className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (preview.kind === "video") {
    return (
      <video
        src={preview.url}
        muted
        playsInline
        onError={() => setBroken(true)}
        aria-label={`Your moment: ${name}`}
        className="size-full object-cover"
      />
    );
  }

  return (
    <motion.img
      src={preview.url}
      alt={`Your moment: ${name}`}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className="size-full object-cover"
      // The moment develops like a print in the tray, once it is ready to paint.
      initial={reduceMotion ? false : { filter: DEVELOP_FROM }}
      animate={loaded ? { filter: DEVELOP_TO } : undefined}
      transition={{ duration: 2.2, ease: EASE.develop }}
    />
  );
}
