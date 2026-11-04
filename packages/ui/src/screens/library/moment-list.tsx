// A single-selection listbox with a fixed preview in wide containers. Only the left column scrolls.
// Rows are revealed in batches; all metadata remains available to search and the other library views.
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events -- custom listbox with arrow-key navigation and selection following focus. */
import { momentLabel, type LinkMoment, type Moment } from "@ambar/core";
import { ArrowSquareOutIcon, DownloadSimpleIcon, FrameCornersIcon, ImageIcon, PencilSimpleIcon, PlayIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useLayoutEffect, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { Button } from "../../components/button.tsx";
import { CopyButton } from "../../components/copy-button.tsx";
import { SkeletonBlock } from "../../components/skeleton-swap.tsx";
import { cn } from "../../lib/utils.ts";
import { useLibrary } from "./library-context.tsx";
import { EditMomentDialog } from "./edit-moment-dialog.tsx";
import { hostOf, savedDate, sourceOf } from "./format.ts";
import { useMomentActions } from "./moment-actions.tsx";
import { MomentKeeperDock } from "./moment-keeper.tsx";
import { useMomentBatches } from "./use-moment-batches.ts";

const SLOW_MS = 8000;

const SPLIT_COLUMNS = "grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]";

const byNewest = (a: Moment, b: Moment) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id);

/** Keep keyboard focus visible without moving the document or the preview. */
function focusRow(row: HTMLElement | undefined, scroll: HTMLElement | null) {
  row?.focus({ preventScroll: true });

  if (row === undefined) return;

  if (scroll === null) {
    row.scrollIntoView({ block: "nearest" });

    return;
  }

  const bounds = row.getBoundingClientRect();
  const viewport = scroll.getBoundingClientRect();

  if (bounds.top < viewport.top) scroll.scrollTop += bounds.top - viewport.top;

  if (bounds.bottom > viewport.bottom) scroll.scrollTop += bounds.bottom - viewport.bottom;
}

type MomentListProps = {
  moments: Moment[];
  split: boolean;
  onOpen: (moment: Moment) => void;
};

export function MomentList({ moments, split, onOpen }: MomentListProps) {
  const { keeper } = useLibrary();
  const scroll = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLDivElement>());
  const focusedId = useRef<string | null>(null);
  const [selection, setSelection] = useState<{ id?: string; index: number }>({ index: 0 });
  const ordered = useMemo(() => moments.toSorted(byNewest), [moments]);
  const found = ordered.findIndex((moment) => moment.id === selection.id);
  const index = found >= 0 ? found : Math.min(selection.index, ordered.length - 1);
  const selected = ordered[index];
  const { count, hasMore, sentinel, loadMore } = useMomentBatches(ordered.length, index + 1, scroll, split);
  const visible = ordered.slice(0, count);

  // Keep the same ID through inserts and renames; a removed selection falls to its nearest neighbour.
  if (selected !== undefined && (selection.id !== selected.id || selection.index !== index)) {
    setSelection({ id: selected.id, index });
  }

  useLayoutEffect(() => {
    if (focusedId.current !== null && !rows.current.has(focusedId.current) && document.activeElement === document.body && selected !== undefined) {
      focusRow(rows.current.get(selected.id), split ? scroll.current : null);
    }
  }, [selected, moments, split]);

  function select(moment: Moment, focus = false) {
    setSelection({ id: moment.id, index: ordered.indexOf(moment) });

    if (focus) {
      focusRow(rows.current.get(moment.id), split ? scroll.current : null);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: count - 1 }[event.key];

    if (target !== undefined) {
      event.preventDefault();
      const moment = ordered[Math.max(0, Math.min(count - 1, target))];

      if (moment !== undefined) select(moment, true);
    } else if ((event.key === "Enter" || event.key === " ") && selected !== undefined) {
      event.preventDefault();
      onOpen(selected);
    }
  }

  return (
    <div data-slot="moment-list" className={cn("@container/moment-list grid min-h-0 min-w-0 gap-gutter", split && ["h-full", SPLIT_COLUMNS])}>
      <div ref={scroll} data-slot="moment-list-scroll" className={cn("min-h-0 min-w-0", split && "overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]")}>
        <div
          role="listbox"
          aria-label="Moments"
          tabIndex={-1}
          onKeyDown={keyDown}
          onBlur={(event) => {
            if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) focusedId.current = null;
          }}
          className="flex min-w-0 flex-col gap-0.5 outline-hidden"
        >
          {visible.map((moment, position) => (
            <div
              key={moment.id}
              ref={(element) => {
                if (element === null) rows.current.delete(moment.id);
                else rows.current.set(moment.id, element);
              }}
              role="option"
              aria-selected={moment.id === selected?.id}
              aria-posinset={position + 1}
              aria-setsize={ordered.length}
              tabIndex={moment.id === selected?.id ? 0 : -1}
              data-moment-id={moment.id}
              onClick={() => {
                select(moment);

                if (!split) onOpen(moment);
              }}
              onDoubleClick={() => split && onOpen(moment)}
              onFocus={() => {
                focusedId.current = moment.id;
                select(moment);
              }}
              className={cn(
                "grid min-h-11 cursor-pointer items-center gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 text-sm text-muted-foreground outline-hidden transition-colors duration-150 motion-reduce:transition-none",
                split ? "grid-cols-[4rem_minmax(0,1.4fr)_2.5rem_minmax(0,0.6fr)_9rem]" : "grid-cols-[4rem_minmax(0,1.2fr)_2.5rem_minmax(0,0.8fr)] @xl/moment-list:grid-cols-[4rem_minmax(0,1.4fr)_2.5rem_minmax(0,0.6fr)_9rem]",
                "hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
                moment.id === selected?.id && "bg-muted font-medium text-foreground",
              )}
            >
              <MomentKindIndicator moment={moment} className={cn(!split && "row-span-2 @xl/moment-list:row-span-1")} />
              <span title={momentLabel(moment)} className="min-w-0 flex-1 truncate">{momentLabel(moment)}</span>
              <MomentKeeperDock keeper={moment.keptBy ?? keeper} compact className={cn("justify-self-center", !split && "row-span-2 @xl/moment-list:row-span-1")} />
              <time dateTime={moment.createdAt} className={cn("w-36 whitespace-nowrap text-xs font-normal text-muted-foreground tabular-nums", split ? "col-start-5 text-right" : "col-start-2 @xl/moment-list:col-start-5 @xl/moment-list:text-right")}>
                {savedDate(moment.createdAt)}
              </time>
            </div>
          ))}
        </div>
        <div ref={sentinel} className="flex flex-col items-center gap-2 px-2 py-5">
          <Button tone="cloud" size="sm" aria-disabled={!hasMore} onClick={() => hasMore && loadMore()}>
            {hasMore ? "Load more" : "All moments loaded"}
          </Button>
          <p role="status" className="relative text-xs text-muted-foreground tabular-nums">
            {!hasMore && <span className="sr-only">All moments loaded. </span>}
            {count} of {ordered.length} moments
          </p>
        </div>
      </div>
      {split && selected !== undefined && (
        <aside aria-label="Selected moment" className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-1 pb-1 [scrollbar-gutter:stable]">
          <div key={selected.id} className="mx-auto flex w-full max-w-[50rem] flex-col gap-5">
            <PreviewFrame moment={selected} />
            <Details moment={selected} onTrash={() => { focusedId.current = selected.id; }} />
          </div>
        </aside>
      )}
    </div>
  );
}

function MomentKindIndicator({ moment, className }: { moment: Moment; className?: string }) {
  const badge = {
    photo: { label: "IMAGE", color: "bg-leaf text-cloud" },
    clip: { label: "VIDEO", color: "bg-sky text-ink" },
    link: { label: "URL", color: "border border-sky-deep/30 bg-cloud text-sky-deep dark:border-sky/30 dark:bg-secondary dark:text-sky" },
    file: { label: "PDF", color: "bg-muted text-muted-foreground" },
  }[moment.kind];

  return (
    <span className={cn("inline-flex h-6 w-16 items-center justify-center rounded-full px-2 text-[10px] font-semibold tracking-[0.06em]", badge.color, className)}>
      {badge.label}
    </span>
  );
}

/** A list-shaped placeholder with the same panel geometry, rather than a grid of cards. */
export function LoadingMomentList({ split }: { split: boolean }) {
  return (
    <div className={cn("grid h-full min-h-0 gap-gutter overflow-hidden", split && SPLIT_COLUMNS)}>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "grid min-h-11 shrink-0 grid-cols-[4rem_minmax(0,1.2fr)_2.5rem_minmax(0,0.8fr)] items-center gap-x-3 gap-y-0.5 px-3 py-2",
              split && "grid-cols-[4rem_minmax(0,1.4fr)_2.5rem_minmax(0,0.6fr)_9rem]",
              !split && "@xl/moment-list:grid-cols-[4rem_minmax(0,1.4fr)_2.5rem_minmax(0,0.6fr)_9rem]",
            )}
          >
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className={index % 3 === 0 ? "h-3 w-2/5" : "h-3 w-3/5"} />
            <SkeletonBlock className="size-8 justify-self-center rounded-full" />
            <SkeletonBlock className={cn("hidden h-2.5 w-36", split ? "col-start-5 block" : "col-start-2 @xl/moment-list:col-start-5 @xl/moment-list:block")} />
          </div>
        ))}
      </div>
      {split && (
        <div className="mx-auto flex w-full max-w-[50rem] flex-col gap-5">
          <SkeletonBlock className="aspect-video max-h-[45dvh] shrink-0 rounded-2xl" />
          <SkeletonBlock className="h-6 w-2/5" />
          <div className="flex flex-col gap-4 border-t pt-5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewFrame({ moment }: { moment: Moment }) {
  const [browsing, setBrowsing] = useState(false);
  const embed = moment.kind === "link" ? moment.embed : undefined;

  return (
    <section aria-label="Preview" className="relative aspect-video max-h-[45dvh] w-full shrink-0 rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
      <div className="relative size-full overflow-hidden rounded-xl bg-muted/35">
        {browsing && moment.kind === "link" ? <LivePage moment={moment} /> : <SavedMedia moment={moment} />}
      </div>
      {embed !== undefined && (
        <Button tone="cloud" size="sm" className="absolute right-4 bottom-4" onClick={() => setBrowsing(!browsing)}>
          {browsing ? <XIcon weight="bold" aria-hidden /> : embed.kind === "player" ? <PlayIcon weight="fill" aria-hidden /> : null}
          {browsing ? "Exit" : embed.kind === "player" ? "Play" : "Browse page"}
        </Button>
      )}
    </section>
  );
}

function PreviewImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (src === undefined || src === "" || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <ImageIcon aria-hidden className="size-8" />
        Preview unavailable
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} className="absolute inset-0 size-full object-contain" />;
}

function SavedMedia({ moment }: { moment: Moment }) {
  switch (moment.kind) {
    case "link":
      return (
        <>
          <PreviewImage key={moment.imageUrl} src={moment.imageUrl} alt={`Saved capture of ${momentLabel(moment)}`} />
          {moment.embed === undefined && moment.imageUrl !== undefined && (
            <p className="absolute inset-x-3 bottom-3 rounded-xl bg-background/90 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur">
              This site can't be shown inside Ambar. Open the original to visit it.
            </p>
          )}
        </>
      );
    case "photo":
      return <PreviewImage key={moment.mediaUrl} src={moment.mediaUrl} alt={momentLabel(moment)} />;
    case "clip":
      return <SavedClip moment={moment} />;
    case "file":
      return <PreviewImage key={moment.previewUrl} src={moment.previewUrl} alt={`First page of ${moment.name}`} />;
  }
}

function SavedClip({ moment }: { moment: Extract<Moment, { kind: "clip" }> }) {
  const [failed, setFailed] = useState(false);

  if (failed || moment.mediaUrl === "") {
    return <PreviewImage src={moment.posterUrl} alt={momentLabel(moment)} />;
  }

  // oxlint-disable-next-line jsx-a11y/media-has-caption -- the user's own clip; no captions exist for it.
  return <video src={moment.mediaUrl} poster={moment.posterUrl} onError={() => setFailed(true)} controls playsInline muted className="absolute inset-0 size-full object-contain" aria-label={momentLabel(moment)} />;
}

/** The live page, sandboxed: scripts and forms work inside it, but it can't navigate Ambar itself. */
function LivePage({ moment }: { moment: LinkMoment }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const embed = moment.embed;

  useEffect(() => {
    if (loaded) {
      return;
    }

    const timer = setTimeout(() => setSlow(true), SLOW_MS);

    return () => clearTimeout(timer);
  }, [loaded]);

  if (embed === undefined) {
    return null;
  }

  return (
    <>
      {/* The capture stays underneath until the page has painted, then the page fades in over it. */}
      {moment.imageUrl !== undefined && <img src={moment.imageUrl} alt="" className="absolute inset-0 size-full object-contain" />}
      <iframe
        title={`${momentLabel(moment)}, live`}
        src={embed.url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
        allow={embed.kind === "player" ? "autoplay; encrypted-media; fullscreen" : undefined}
        onLoad={() => setLoaded(true)}
        className={cn("absolute inset-0 size-full border-0 bg-background transition-opacity duration-300 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
      />
      <p aria-live="polite" className={cn("absolute inset-x-3 bottom-3 rounded-xl bg-background/90 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur", loaded && "sr-only")}>
        {loaded ? "Page loaded." : slow ? "Taking longer than usual. You can open the original instead." : "Loading the page…"}
      </p>
    </>
  );
}

/** A contained preview is followed by its title, direct actions and the original's details. */
function Details({ moment, onTrash }: { moment: Moment; onTrash: () => void }) {
  const actions = useMomentActions(moment);
  const source = sourceOf(moment);
  const [editing, setEditing] = useState(false);
  const edit = useRef<HTMLButtonElement>(null);
  const canvasLabel = moment.onCanvas ? "Remove from Canvas" : "Add to Canvas";

  function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    actions.open();
  }

  return (
    <section aria-label="Details" className="flex min-w-0 flex-col gap-5 px-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 title={momentLabel(moment)} className="line-clamp-2 text-2xl leading-tight tracking-tight wrap-anywhere">{momentLabel(moment)}</h2>
          {source !== undefined && <p className="mt-1 truncate text-sm text-muted-foreground">{source}</p>}
        </div>
        <div role="group" aria-label="Moment actions" className="flex shrink-0 items-center gap-2">
          <Button ref={edit} tone="cloud" size="icon-sm" aria-label="Edit title" title="Edit title" onClick={() => setEditing(true)}>
            <PencilSimpleIcon weight="bold" aria-hidden />
          </Button>
          <Button tone={moment.onCanvas ? "leaf" : "cloud"} size="icon-sm" aria-label={canvasLabel} title={canvasLabel} aria-pressed={moment.onCanvas === true} onClick={actions.canvas}>
            <FrameCornersIcon weight="bold" aria-hidden />
          </Button>
          <Button tone="danger" size="icon-sm" aria-label="Move to Trash" title="Move to Trash" onClick={() => {
            onTrash();
            actions.trash();
          }}>
            <TrashIcon weight="bold" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-5">
        <h3 className="font-sans text-sm font-semibold">More details:</h3>
        <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{moment.kind === "link" ? "URL" : "Original"}</dt>
          <dd className="min-w-0 text-right">
            {moment.kind === "link" ? (
              <a href={moment.url} onClick={open} target="_blank" rel="noreferrer" title={moment.url} className="inline-block max-w-full truncate rounded-sm text-sky-deep underline-offset-4 outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring">
                {hostOf(moment.url)}
              </a>
            ) : (
              <Button tone="cloud" size="sm" onClick={actions.open}>
                Open original
                <ArrowSquareOutIcon weight="bold" aria-hidden />
              </Button>
            )}
          </dd>
          <dt className="text-muted-foreground">Saved</dt>
          <dd className="text-right tabular-nums"><time dateTime={moment.createdAt}>{savedDate(moment.createdAt)}</time></dd>
        </dl>
        {moment.kind !== "link" && (
          <div role="group" aria-label="Original actions" className="flex flex-wrap items-center gap-2 pt-2">
            <CopyButton label="Copy" onCopy={() => actions.copy({ notifySuccess: false })} />
            {actions.download !== undefined && (
              <Button tone="cloud" size="sm" onClick={actions.download}>
                <DownloadSimpleIcon weight="bold" aria-hidden />
                Download
              </Button>
            )}
          </div>
        )}
      </div>
      <EditMomentDialog moment={moment} open={editing} onOpenChange={setEditing} returnFocus={edit} />
    </section>
  );
}
