// Content first: an uncropped preview, then the keeper, title, source and a stable menu in one footer.
import { momentImage, momentLabel, type Moment, type MomentKeeper } from "@ambar/core";
import { FilePdfIcon, GlobeHemisphereWestIcon, ImageIcon, LinkSimpleIcon, PlayIcon, UserIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button } from "../../components/button.tsx";
import { cn } from "../../lib/utils.ts";
import { aspectOf, duration, shortDate, sourceOf } from "./format.ts";
import { useLibrary } from "./library-context.tsx";
import { MomentMenu, QuickActions, useMomentActions } from "./moment-actions.tsx";

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
  const source = sourceOf(moment);

  const kindLabel = moment.kind === "clip"
    ? `clip, ${duration(moment.durationMs)}`
    : moment.kind === "file"
      ? `PDF${moment.pages === undefined ? "" : ` · ${moment.pages} ${moment.pages === 1 ? "page" : "pages"}`}`
      : moment.kind;

  return (
    <article
      ref={card}
      data-slot="moment-card"
      data-kind={moment.kind}
      className={cn("group relative min-w-0 rounded-3xl border border-border/70 bg-muted/35 p-1.5 shadow-[0_1px_2px_rgb(20_20_20/0.04)]", className)}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpen(moment)}
          aria-label={`Open ${label}, ${kindLabel}, ${shortDate(moment.createdAt)}`}
          className="block w-full cursor-pointer overflow-hidden rounded-[1.125rem] bg-card outline-hidden focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring"
        >
          <Preview key={momentImage(moment)} moment={moment} />
        </button>
        <QuickActions
          moment={moment}
          className="pointer-events-none absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:pointer-events-auto pointer-coarse:opacity-100"
        />
      </div>
      <div className="flex min-w-0 items-center gap-2.5 px-2 py-3">
        <Keeper keeper={moment.keptBy ?? keeper} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(moment)}
            title={label}
            className="block w-full cursor-pointer truncate rounded-sm text-left font-medium text-foreground outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
          >
            <span className={size === "feature" ? "text-lg" : "text-sm"}>{label}</span>
          </button>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {source !== undefined && <span>{source} · </span>}
            <time dateTime={moment.createdAt}>{shortDate(moment.createdAt)}</time>
          </p>
        </div>
        {moment.kind === "link" && (
          <Button tone="cloud" size="icon-sm" onClick={actions.open} aria-label={`Open ${source ?? label}`} title={moment.url}>
            <LinkSimpleIcon weight="bold" aria-hidden />
          </Button>
        )}
        <MomentMenu moment={moment} container={card} />
      </div>
    </article>
  );
}

/** A keeper is authorship, never inferred from the moment's sharing permissions. */
function Keeper({ keeper }: { keeper?: MomentKeeper }) {
  const [failed, setFailed] = useState(false);
  const name = keeper?.name ?? "you";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("");

  return (
    <span title={`Kept by ${name}`} className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-sky/25 text-xs font-medium text-foreground uppercase">
      <span className="sr-only">Kept by {name}</span>
      {keeper === undefined ? <UserIcon weight="bold" aria-hidden className="size-4" /> : <span aria-hidden>{initials}</span>}
      {keeper?.avatarUrl !== undefined && !failed && (
        <img src={keeper.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}

/** Bound very tall previews to the card while keeping every pixel of the original visible. */
function Preview({ moment }: { moment: Moment }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = momentImage(moment);
  const missing = src === undefined || src === "" || failed;
  const Icon = moment.kind === "link" ? GlobeHemisphereWestIcon : moment.kind === "file" ? FilePdfIcon : ImageIcon;

  return (
    <div aria-hidden="true" className="relative max-h-144 min-h-36 overflow-hidden bg-muted/35" style={{ aspectRatio: aspectOf(moment) }}>
      {!missing && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn("absolute inset-0 size-full object-contain transition-opacity duration-200 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
      {missing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
          <Icon weight="duotone" aria-hidden className="size-10" />
          <span className="max-w-full truncate text-sm">{moment.kind === "link" ? sourceOf(moment) ?? "Saved link" : "Preview unavailable"}</span>
        </span>
      )}
      {moment.kind === "clip" && (
        <>
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full border border-cloud/30 bg-ink/65 text-cloud backdrop-blur-sm">
              <PlayIcon weight="fill" aria-hidden className="ml-0.5 size-5" />
            </span>
          </span>
          <span className="absolute right-3 bottom-3 rounded-md bg-ink/75 px-2 py-1 text-xs font-medium text-cloud tabular-nums">{duration(moment.durationMs)}</span>
        </>
      )}
      {moment.kind === "file" && (
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-cloud/95 px-2 py-1 text-xs font-medium text-ink">
          <FilePdfIcon weight="bold" aria-hidden className="size-3.5" />
          PDF{moment.pages === undefined ? "" : ` · ${moment.pages} ${moment.pages === 1 ? "page" : "pages"}`}
        </span>
      )}
    </div>
  );
}
