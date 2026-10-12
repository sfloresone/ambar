// One card per moment, with a frame that says what it is at a glance: a photo is framed like a print, a
// clip sits in a film strip, a link is a postcard with its site stamped on it, a document is a page with
// a folded corner. Frames inspired by opensourceui's polaroid, film-strip and postcard cards (MIT).
import { momentLabel, type Moment } from "@ambar/core";
import { ArrowUpRightIcon, FilePdfIcon, PlayIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { cn } from "../../lib/utils.ts";
import { aspectOf, duration, shortDate, sourceOf } from "./format.ts";
import { QuickActions } from "./moment-actions.tsx";

type MomentCardProps = {
  moment: Moment;
  onOpen: (moment: Moment) => void;
  /** Feature: the answer's best match. */
  size?: "default" | "feature";
  className?: string;
};

export function MomentCard({ moment, onOpen, size = "default", className }: MomentCardProps) {
  const label = momentLabel(moment);

  return (
    <article data-slot="moment-card" data-kind={moment.kind} className={cn("group relative", className)}>
      <button
        type="button"
        onClick={() => onOpen(moment)}
        aria-label={`${label}, ${moment.kind === "file" ? "document" : moment.kind}, ${shortDate(moment.createdAt)}`}
        className="block w-full cursor-pointer rounded-2xl text-left outline-hidden transition-transform duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring active:scale-[0.99] motion-reduce:transition-none"
      >
        <Frame moment={moment} feature={size === "feature"} />
      </button>
      <QuickActions
        moment={moment}
        className="absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
      />
    </article>
  );
}

function Frame({ moment, feature }: { moment: Moment; feature: boolean }) {
  switch (moment.kind) {
    case "photo":
      return (
        <div className="rounded-2xl border bg-card p-2 pb-3 shadow-[0_1px_2px_rgb(20_20_20/0.05),0_8px_20px_rgb(20_20_20/0.05)]">
          <Media src={moment.mediaUrl} ratio={aspectOf(moment)} className="rounded-xl" />
          <Caption moment={moment} feature={feature} />
        </div>
      );
    case "clip":
      return (
        <div className="rounded-2xl bg-ink px-2 pb-3 text-cloud shadow-[0_8px_20px_rgb(20_20_20/0.18)]">
          <Sprockets />
          <div className="relative">
            <Media src={moment.posterUrl} ratio={aspectOf(moment)} className="rounded-md" />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur">
              <PlayIcon weight="fill" aria-hidden className="size-3" />
              {duration(moment.durationMs)}
            </span>
          </div>
          <Sprockets />
          <Caption moment={moment} feature={feature} tone="dark" />
        </div>
      );
    case "link": {
      const source = sourceOf(moment);

      return (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_20_20/0.05),0_8px_20px_rgb(20_20_20/0.05)]">
          {moment.imageUrl !== undefined && <Media src={moment.imageUrl} ratio={aspectOf(moment)} />}
          <div className="relative flex flex-col gap-1.5 p-3.5">
            {/* The site, stamped on the postcard. */}
            <span aria-hidden className="absolute -top-5 right-3 grid size-10 rotate-3 place-items-center rounded-sm border-2 border-dashed border-ink/20 bg-cloud font-heading text-base font-bold text-ink uppercase">
              {(source ?? "·").charAt(0)}
            </span>
            <p className={cn("line-clamp-2 pr-10 font-medium text-pretty", feature ? "text-lg" : "text-sm")}>{momentLabel(moment)}</p>
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRightIcon weight="bold" aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{[source, shortDate(moment.createdAt)].filter(Boolean).join(" · ")}</span>
            </p>
          </div>
        </div>
      );
    }

    case "file":
      return (
        <div className="rounded-2xl border bg-card p-3 shadow-[0_1px_2px_rgb(20_20_20/0.05),0_8px_20px_rgb(20_20_20/0.05)]">
          <div className="relative">
            {/* A page with its corner folded. */}
            <Media src={moment.previewUrl} ratio={aspectOf(moment)} className="rounded-sm border [clip-path:polygon(0_0,calc(100%-1.5rem)_0,100%_1.5rem,100%_100%,0_100%)]" />
            <span aria-hidden className="absolute top-0 right-0 size-6 rounded-bl-md bg-muted shadow-[-1px_1px_2px_rgb(20_20_20/0.12)]" />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-cloud">
              <FilePdfIcon weight="bold" aria-hidden className="size-3.5" />
              PDF{moment.pages === undefined ? "" : ` · ${moment.pages} ${moment.pages === 1 ? "page" : "pages"}`}
            </span>
          </div>
          <Caption moment={moment} feature={feature} />
        </div>
      );
  }
}

function Caption({ moment, feature, tone = "light" }: { moment: Moment; feature: boolean; tone?: "light" | "dark" }) {
  const source = sourceOf(moment);

  return (
    <div className="flex flex-col gap-0.5 px-1.5 pt-2.5">
      <p className={cn("truncate font-medium", feature ? "text-lg" : "text-sm")}>{momentLabel(moment)}</p>
      <p className={cn("truncate text-xs", tone === "dark" ? "text-cloud/60" : "text-muted-foreground")}>
        {[source, shortDate(moment.createdAt)].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function Sprockets() {
  return (
    <div aria-hidden className="flex justify-between px-1 py-1.5">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={`hole-${index}`} className="h-1.5 w-2.5 rounded-[2px] bg-cloud/25" />
      ))}
    </div>
  );
}

type MediaProps = {
  src?: string;
  ratio: string;
  className?: string;
};

/** The image, fading in once decoded; a quiet placeholder until then (or if there is none). */
function Media({ src, ratio, className }: MediaProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} style={{ aspectRatio: ratio }}>
      {src !== undefined && src !== "" && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}

