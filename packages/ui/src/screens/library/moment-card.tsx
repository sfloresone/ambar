// An uncropped preview, a keeper overlapping its corner, and a compact title and actions below.
import { momentImage, momentLabel, type Moment } from "@ambar/core";
import { FilePdfIcon, GlobeHemisphereWestIcon, ImageIcon, LinkSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button } from "../../components/button.tsx";
import { cn } from "../../lib/utils.ts";
import { aspectOf, duration } from "./format.ts";
import { useLibrary } from "./library-context.tsx";
import { MomentMenu, useMomentActions } from "./moment-actions.tsx";
import { MomentKeeperAvatar } from "./moment-keeper.tsx";

type MomentCardProps = {
  moment: Moment;
  onOpen: (moment: Moment) => void;
  /** Feature: the answer's best match. */
  size?: "default" | "feature";
  className?: string;
};

export function MomentCard({ moment, onOpen, size = "default", className }: MomentCardProps) {
  const card = useRef<HTMLElement>(null);
  const actions = useMomentActions(moment);
  const { keeper } = useLibrary();
  const label = momentLabel(moment);

  const kindLabel = moment.kind === "clip"
    ? `clip, ${duration(moment.durationMs)}`
    : moment.kind === "file"
      ? `PDF${moment.pages === undefined ? "" : ` · ${moment.pages} ${moment.pages === 1 ? "page" : "pages"}`}`
      : moment.kind === "link"
        ? // Matches the words a link without a capture shows ("Saved link"), so the name includes what's on screen.
          "saved link"
        : moment.kind;

  return (
    <article
      ref={card}
      data-slot="moment-card"
      data-kind={moment.kind}
      className={cn("relative min-w-0 rounded-2xl border border-border/60 bg-card p-1 shadow-[0_1px_2px_rgb(20_20_20/0.03)]", className)}
    >
      <button
        type="button"
        onClick={() => onOpen(moment)}
        aria-label={`Open ${label}, ${kindLabel}`}
        className="block w-full cursor-pointer overflow-hidden rounded-xl bg-muted/35 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring"
      >
        <Preview key={momentImage(moment)} moment={moment} />
      </button>
      <div className="absolute -top-2 -left-2 z-10">
        <MomentKeeperAvatar keeper={moment.keptBy ?? keeper} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5 px-1.5 py-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(moment)}
            title={label}
            className="block w-full cursor-pointer truncate rounded-sm text-left font-medium text-foreground outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
          >
            <span className={size === "feature" ? "text-lg" : "text-sm"}>{label}</span>
          </button>
        </div>
        <Button
          tone="cloud"
          size="icon-sm"
          className="size-8"
          onClick={actions.open}
          aria-label={`${moment.kind === "link" ? "Open link" : "Open original"} for ${label}`}
          title={moment.kind === "link" ? moment.url : "Open original"}
        >
          <LinkSimpleIcon weight="bold" aria-hidden />
        </Button>
        <MomentMenu moment={moment} container={card} />
      </div>
    </article>
  );
}

/** Metadata reserves the space; decoded image dimensions determine the final shape for every kind. */
function Preview({ moment }: { moment: Moment }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState(aspectOf(moment));
  const src = momentImage(moment);
  const missing = src === undefined || src === "" || failed;
  const Icon = moment.kind === "link" ? GlobeHemisphereWestIcon : moment.kind === "file" ? FilePdfIcon : ImageIcon;

  return (
    <div data-slot="moment-preview" aria-hidden="true" className="relative overflow-hidden bg-muted/35" style={{ aspectRatio: ratio }}>
      {!missing && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;

            if (naturalWidth > 0 && naturalHeight > 0) {
              setRatio(`${naturalWidth} / ${naturalHeight}`);
            }

            setLoaded(true);
          }}
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 size-full object-contain transition-opacity duration-200 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
      {missing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
          <Icon weight="duotone" aria-hidden className="size-10" />
          <span className="max-w-full truncate text-sm">{moment.kind === "link" ? "Saved link" : "Preview unavailable"}</span>
        </span>
      )}
      {moment.kind === "clip" && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full border border-cloud/30 bg-ink/65 text-cloud backdrop-blur-sm">
            <PlayIcon weight="fill" aria-hidden className="ml-0.5 size-5" />
          </span>
        </span>
      )}
    </div>
  );
}
