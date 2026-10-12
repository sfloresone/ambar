// The list view: titles only on the left, the selected moment large on the right. Nothing previews until
// it is chosen. Links show their saved capture; "Browse page" swaps in the live page (sandboxed), only on
// request and only one at a time. Sites that can't be framed (the server says so in `embed`) keep their
// capture and open in the browser. Narrow spaces get the titles alone, and a tap opens the viewer.
//
// The list is an ARIA listbox (custom rows); selection follows focus, and the keyboard is handled by the
// listbox (arrows, Home/End, Enter).
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events -- custom listbox, see above. */
import { momentLabel, type LinkMoment, type Moment } from "@ambar/core";
import { ArrowSquareOutIcon, CopyIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from "react";

import { Button } from "../../components/button.tsx";
import { cn } from "../../lib/utils.ts";
import { sourceOf } from "./format.ts";
import { useMomentActions } from "./moment-actions.tsx";

/** From this container width the preview sits beside the list (48 rem). */
const SPLIT_PX = 768;

/** After this, a live page that hasn't loaded says so and offers the browser. */
const SLOW_MS = 8000;

/** Whether the element is wide enough for the split, kept in sync with its size. */
function useWide(ref: RefObject<HTMLElement | null>): boolean {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setWide((entry?.contentRect.width ?? 0) >= SPLIT_PX));

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return wide;
}

const byNewest = (a: Moment, b: Moment) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

type MomentListProps = {
  moments: Moment[];
  /** Opens the full viewer. */
  onOpen: (moment: Moment) => void;
};

export function MomentList({ moments, onOpen }: MomentListProps) {
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Newest first: the order on screen is the order the keyboard follows.
  const ordered = moments.toSorted(byNewest);
  const selected = ordered.find((moment) => moment.id === selectedId) ?? ordered[0];

  function select(moment: Moment | undefined, focus: boolean) {
    if (moment === undefined) {
      return;
    }

    setSelectedId(moment.id);

    if (focus) {
      root.current?.querySelector<HTMLElement>(`[data-moment-id="${moment.id}"]`)?.focus();
    }
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = selected === undefined ? -1 : ordered.indexOf(selected);
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: ordered.length - 1 }[event.key];

    if (target !== undefined) {
      event.preventDefault();
      select(ordered[Math.max(0, Math.min(ordered.length - 1, target))], true);
    } else if (event.key === "Enter" && selected !== undefined) {
      event.preventDefault();
      onOpen(selected);
    }
  }

  return (
    // The list keeps a readable column (15–22 rem, about a quarter); the preview takes the rest. Both and
    // the gutter between them scale with the space, so resizing never jumps.
    <div ref={root} className={cn("grid gap-gutter", wide && "grid-cols-[clamp(15rem,24%,22rem)_minmax(0,1fr)]")}>
      <div role="listbox" aria-label="Moments" tabIndex={-1} onKeyDown={keyDown} className="flex min-w-0 flex-col gap-0.5 self-start outline-hidden">
        {ordered.map((moment) => (
          <div
            key={moment.id}
            role="option"
            aria-selected={moment.id === selected?.id}
            tabIndex={moment.id === selected?.id ? 0 : -1}
            data-moment-id={moment.id}
            onClick={() => (wide ? select(moment, false) : onOpen(moment))}
            onDoubleClick={() => onOpen(moment)}
            onFocus={() => wide && select(moment, false)}
            className={cn(
              "cursor-pointer truncate rounded-lg px-3 py-2 text-sm text-muted-foreground outline-hidden transition-colors duration-150 motion-reduce:transition-none",
              "hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
              moment.id === selected?.id && "bg-muted font-medium text-foreground",
            )}
          >
            {momentLabel(moment)}
          </div>
        ))}
      </div>

      {wide && selected !== undefined && (
        // A new key per moment: changing the selection fades the next one in and always leaves a live page.
        <aside
          key={selected.id}
          aria-label="Selected moment"
          className="sticky top-24 flex h-[calc(100dvh-12rem)] min-h-[32rem] min-w-0 animate-in flex-col gap-5 self-start duration-200 fade-in motion-reduce:animate-none"
        >
          <PreviewFrame moment={selected} />
          <Details moment={selected} />
        </aside>
      )}
    </div>
  );
}

/** The selected moment in a frame: a slim bar over its media. Links can be browsed live, on request. */
function PreviewFrame({ moment }: { moment: Moment }) {
  const actions = useMomentActions(moment);
  const [browsing, setBrowsing] = useState(false);
  const embed = moment.kind === "link" ? moment.embed : undefined;
  const source = sourceOf(moment) ?? momentLabel(moment);

  return (
    <section aria-label="Preview" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_20_20/0.05),0_12px_32px_rgb(20_20_20/0.07)]">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-heading text-xs font-bold uppercase">
          {source.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{source}</span>
        {embed !== undefined &&
          (browsing ? (
            <Button tone="ink" size="sm" onClick={() => setBrowsing(false)}>
              <XIcon weight="bold" aria-hidden />
              Exit
            </Button>
          ) : (
            <Button tone="cloud" size="sm" onClick={() => setBrowsing(true)}>
              {embed.kind === "player" && <PlayIcon weight="fill" aria-hidden />}
              {embed.kind === "player" ? "Play" : "Browse page"}
            </Button>
          ))}
        <Button tone="cloud" size="icon-sm" onClick={actions.copy} aria-label={moment.kind === "link" ? "Copy link" : "Copy"} title="Copy">
          <CopyIcon weight="bold" />
        </Button>
        <Button tone="cloud" size="icon-sm" onClick={actions.open} aria-label="Open original" title="Open original">
          <ArrowSquareOutIcon weight="bold" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 bg-muted">
        {browsing && moment.kind === "link" ? <LivePage moment={moment} /> : <SavedMedia moment={moment} />}
      </div>
    </section>
  );
}

/** What was kept: the capture of a link, or the photo, clip or document's first page. */
function SavedMedia({ moment }: { moment: Moment }) {
  switch (moment.kind) {
    case "link":
      return (
        <>
          {moment.imageUrl !== undefined && <img src={moment.imageUrl} alt="" className="absolute inset-0 size-full object-cover object-top" />}
          {moment.embed === undefined && (
            <p className="absolute inset-x-3 bottom-3 rounded-xl bg-cloud/90 px-3 py-2 text-sm text-ink shadow-sm backdrop-blur">
              This site can't be shown inside Ambar. Open the original to visit it.
            </p>
          )}
        </>
      );
    case "photo":
      return <img src={moment.mediaUrl} alt={momentLabel(moment)} className="absolute inset-0 size-full object-contain" />;
    case "clip":
      return (
        // oxlint-disable-next-line jsx-a11y/media-has-caption -- the user's own clip; no captions exist for it.
        <video src={moment.mediaUrl} poster={moment.posterUrl} controls playsInline muted className="absolute inset-0 size-full object-contain" aria-label={momentLabel(moment)} />
      );
    case "file":
      return <img src={moment.previewUrl} alt={`First page of ${moment.name}`} className="absolute inset-0 m-auto max-h-[92%] max-w-[92%] object-contain shadow-[0_8px_24px_rgb(20_20_20/0.15)]" />;
  }
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
      {moment.imageUrl !== undefined && <img src={moment.imageUrl} alt="" className="absolute inset-0 size-full object-cover object-top" />}
      <iframe
        title={`${momentLabel(moment)}, live`}
        src={embed.url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
        allow={embed.kind === "player" ? "autoplay; encrypted-media; fullscreen" : undefined}
        onLoad={() => setLoaded(true)}
        className={cn("absolute inset-0 size-full border-0 bg-cloud transition-opacity duration-300 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0")}
      />
      <p aria-live="polite" className={cn("absolute inset-x-3 bottom-3 rounded-xl bg-cloud/90 px-3 py-2 text-sm text-ink shadow-sm backdrop-blur", loaded && !slow && "sr-only")}>
        {loaded ? "Page loaded." : slow ? "Taking longer than usual. You can open the original instead." : "Loading the page…"}
      </p>
    </>
  );
}

/** Below the frame: the title, the page's name, its address (in sky-deep) and when it was kept. */
function Details({ moment }: { moment: Moment }) {
  const actions = useMomentActions(moment);
  const kept = new Date(moment.createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  const source = sourceOf(moment);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    // Through the platform's "open", so desktop and mobile can use their own browser handoff.
    event.preventDefault();
    actions.open();
  }

  return (
    <section aria-label="Details" className="flex shrink-0 flex-col gap-1 px-1">
      <h2 className="text-2xl leading-tight tracking-tight text-balance">{momentLabel(moment)}</h2>
      {source !== undefined && <p className="text-sm text-muted-foreground">{source}</p>}
      {moment.kind === "link" && (
        <a href={moment.url} onClick={open} target="_blank" rel="noreferrer" className="w-fit max-w-full truncate text-sm text-sky-deep underline-offset-4 hover:underline">
          {moment.url}
        </a>
      )}
      {moment.kind === "file" && <p className="truncate text-sm">{moment.name}</p>}
      <p className="text-sm text-muted-foreground">{kept}</p>
    </section>
  );
}
