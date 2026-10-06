// The user's moment, pinned on every step of the keep flow, with a status line that tells the story:
// Ready to keep → Waiting for you → Keeping… 64% → Kept.
import { CheckIcon, ImageBrokenIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { DEVELOP_FROM, DEVELOP_TO, EASE } from "../../lib/motion.ts";
import { createMomentPreview, revokeMomentPreview, type MomentPreview } from "../../lib/preview.ts";
import { cn } from "../../lib/utils.ts";

export type MomentStatus = "ready" | "waiting" | "keeping" | "kept" | "failed";

type MomentCardProps = {
  file: File;
  status: MomentStatus;
  /** Upload progress, 0 to 1, while keeping. */
  progress?: number;
  /** compact: small row. full: large preview. responsive: row on small screens, large from md. */
  layout?: "compact" | "full" | "responsive";
};

const STATUS_TEXT: Record<Exclude<MomentStatus, "keeping">, string> = {
  ready: "Ready to keep",
  waiting: "Waiting for you",
  kept: "Kept",
  failed: "Couldn't keep it yet",
};

function statusText(status: MomentStatus, progress: number): string {
  return status === "keeping" ? `Keeping… ${Math.round(progress * 100)}%` : STATUS_TEXT[status];
}

const LAYOUT = {
  compact: { card: "flex items-center gap-3 p-2.5 pr-4", media: "size-16 rounded-xl", caption: "" },
  full: { card: "flex flex-col", media: "aspect-4/3 w-full", caption: "px-4 py-3" },
  responsive: {
    card: "flex items-center gap-3 p-2.5 pr-4 md:flex-col md:items-stretch md:gap-0 md:p-0",
    media: "size-16 rounded-xl md:aspect-4/3 md:size-auto md:w-full md:rounded-none",
    caption: "md:px-4 md:py-3",
  },
} as const;

export function MomentCard({ file, status, progress = 0, layout = "responsive" }: MomentCardProps) {
  const preview = useMomentPreview(file);
  const styles = LAYOUT[layout];
  const compact = layout === "compact";

  return (
    <figure
      data-slot="moment-card"
      data-status={status}
      className={cn("overflow-hidden rounded-2xl border bg-card", styles.card)}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-muted", styles.media)}>
        {preview !== null && <PreviewMedia preview={preview} name={file.name} compact={compact} />}
        {status === "keeping" && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1 origin-left bg-leaf transition-[scale] duration-200 motion-reduce:transition-none"
            style={{ scale: `${progress} 1` }}
          />
        )}
      </div>
      <figcaption className={cn("flex min-w-0 flex-col gap-0.5", styles.caption)}>
        <span className="truncate text-sm font-medium">{file.name}</span>
        <span aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <StatusIcon status={status} />
          {statusText(status, progress)}
        </span>
      </figcaption>
    </figure>
  );
}

function StatusIcon({ status }: { status: MomentStatus }) {
  if (status === "kept") {
    return <CheckIcon weight="bold" aria-hidden className="size-4 text-leaf" />;
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
  compact: boolean;
};

function PreviewMedia({ preview, name, compact }: PreviewMediaProps) {
  const reduceMotion = useReducedMotion() === true;
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  if (preview.kind === "unsupported" || broken) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1.5 p-3 text-center">
        <ImageBrokenIcon weight="bold" aria-hidden className="size-6 text-muted-foreground" />
        {!compact && <p className="text-sm text-muted-foreground">This browser can't show a preview of it.</p>}
      </div>
    );
  }

  if (preview.kind === "video") {
    return (
      <video
        src={preview.url}
        muted
        playsInline
        controls={!compact}
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
