// Moments: everything kept, in time, laid out as the person likes (2×2, 3×3, 4×4, or the list with its
// preview panel). Search lives in the global palette (⌘K); keeping lives here (the composer at the
// bottom, or paste and drop anywhere). Platform-free: opening a moment is a callback.
import { countByKind, filterByKind, MOMENT_KINDS, type KindFilter, type Moment } from "@ambar/core";
import { FilePdfIcon, ImageIcon, LinkSimpleIcon, ListBulletsIcon, PlayIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { useRef, useState, type ReactNode } from "react";

import { SegmentedControl, type SegmentIcon } from "../../components/segmented-control.tsx";
import { KeepComposer } from "./keep-composer.tsx";
import { KeepZone } from "./keep-zone.tsx";
import { useLibrary } from "./library-context.tsx";
import { SkeletonSwap } from "../../components/skeleton-swap.tsx";
import { LoadingGrid } from "./loading-grid.tsx";
import { LoadingMomentList, MomentList } from "./moment-list.tsx";
import { MOMENTS_VIEWS, useMomentsSplit, useMomentsView, type MomentsView } from "./moments-view.ts";
import { Timeline } from "./timeline.tsx";
import { cn } from "../../lib/utils.ts";
import { moveInPlace } from "../../lib/view-transition.ts";

/** n×n squares: the density icon for a grid view. */
function GridIcon({ n }: { n: number }) {
  const gap = 1.5;
  const size = (16 - gap * (n - 1)) / n;

  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      {Array.from({ length: n * n }, (_, index) => (
        <rect key={`cell-${index}`} x={(index % n) * (size + gap)} y={Math.floor(index / n) * (size + gap)} width={size} height={size} rx={n > 3 ? 0.6 : 1} />
      ))}
    </svg>
  );
}

const VIEW_ICONS = {
  "2": { label: "Grid, 2 by 2", icon: <GridIcon n={2} /> },
  "3": { label: "Grid, 3 by 3", icon: <GridIcon n={3} /> },
  "4": { label: "Grid, 4 by 4", icon: <GridIcon n={4} /> },
  list: { label: "List with preview", icon: <ListBulletsIcon weight="bold" /> },
} satisfies Record<MomentsView, SegmentIcon>;

const GRID_COLUMNS = { "2": 2, "3": 3, "4": 4 } as const;

const KINDS = {
  all: { label: "All", icon: <SquaresFourIcon weight="bold" aria-hidden /> },
  photo: { label: "Photos", icon: <ImageIcon weight="bold" aria-hidden /> },
  clip: { label: "Clips", icon: <PlayIcon weight="bold" aria-hidden /> },
  link: { label: "Links", icon: <LinkSimpleIcon weight="bold" aria-hidden /> },
  file: { label: "PDFs", icon: <FilePdfIcon weight="bold" aria-hidden /> },
} satisfies Record<KindFilter, { label: string; icon: ReactNode }>;

function isKindFilter(value: string): value is KindFilter {
  return value === "all" || MOMENT_KINDS.some((kind) => kind === value);
}

type LibraryScreenProps = {
  onOpenMoment: (moment: Moment) => void;
};

export function LibraryScreen({ onOpenMoment }: LibraryScreenProps) {
  const { moments } = useLibrary();
  const { view, setView } = useMomentsView();
  const screen = useRef<HTMLDivElement>(null);
  const wide = useMomentsSplit(screen);
  const split = view === "list" && wide;
  const results = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  // Not remembered: a library that opens filtered looks like it lost things.
  const [chosen, setChosen] = useState<KindFilter>("all");
  const counts = countByKind(moments ?? []);
  const present = MOMENT_KINDS.filter((kind) => counts[kind] > 0);
  // Back to all once the chosen kind has nothing left (its last moment trashed).
  const kind = chosen !== "all" && counts[chosen] > 0 ? chosen : "all";
  const shown = moments === null ? null : filterByKind(moments, kind);

  function choose(next: string) {
    if (!isKindFilter(next)) return;

    const area = results.current;
    const hadFocus = area?.contains(document.activeElement) ?? false;

    // A focused card the filter hid takes focus with it: hand it to the chosen chip instead.
    void moveInPlace(area, () => setChosen(next)).then(() => {
      if (hadFocus && !(area?.contains(document.activeElement) ?? false)) {
        chips.current?.querySelector<HTMLElement>("[data-pressed]")?.focus();
      }
    }, () => {});
  }

  return (
    // pb-24: the last row stays clear of the Keep pill in the corner.
    <div ref={screen} data-moments-split={split || undefined} className={cn("@container flex flex-col gap-8 pb-24", split && "min-h-0 flex-1 gap-5 pb-20")}>
      <KeepZone />
      <KeepComposer />
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        {/* Also where focus lands after the iris opens. */}
        <div className="flex items-center gap-3">
          <h1 tabIndex={-1} className="text-3xl tracking-tight">Moments</h1>
          {moments !== null && shown !== null && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums" aria-label={kind === "all" ? `${moments.length} kept moments` : `${shown.length} of ${moments.length} kept moments shown`}>
              {kind === "all" ? moments.length : `${shown.length} of ${moments.length}`}
            </span>
          )}
        </div>
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-3">
          {/* Only kinds that exist; one kind alone needs no filter. */}
          {present.length > 1 && (
            <div ref={chips} className="max-w-full min-w-0 overflow-x-auto">
              <SegmentedControl
                options={["all", ...present]}
                label="Kind"
                value={kind}
                onValueChange={choose}
                labels={Object.fromEntries(
                  (["all", ...present] as const).map((option) => [
                    option,
                    <>
                      <span className="contents @max-3xl:hidden">{KINDS[option].icon}</span>
                      {KINDS[option].label}{" "}
                      <span className="text-xs text-muted-foreground tabular-nums">{option === "all" ? moments?.length : counts[option]}</span>
                    </>,
                  ]),
                )}
              />
            </div>
          )}
          <SegmentedControl options={[...MOMENTS_VIEWS]} icons={VIEW_ICONS} label="Layout" defaultValue={view} onValueChange={setView} />
        </div>
      </header>

      {/* Loading holds the geometry of the chosen view. */}
      <output className="sr-only">
        {kind === "all" || moments === null || shown === null ? "" : `${KINDS[kind].label}: ${shown.length} of ${moments.length} shown`}
      </output>

      <SkeletonSwap
        ready={moments !== null}
        label="Moments"
        skeleton={view === "list" ? <LoadingMomentList split={split} /> : <LoadingGrid columns={GRID_COLUMNS[view]} />}
        className={cn(moments === null && !split && "min-h-[60svh]", split && "min-h-0 flex-1 [&>div]:h-full [&>div]:min-h-0")}
      >
        {moments?.length === 0 && <EmptyLibrary />}
        {shown !== null && shown.length > 0 && (
          <div ref={results} className={cn(split && "contents")}>
            {view === "list" ? <MomentList moments={shown} split={split} onOpen={onOpenMoment} /> : <Timeline moments={shown} onOpen={onOpenMoment} columns={GRID_COLUMNS[view]} />}
          </div>
        )}
      </SkeletonSwap>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <div aria-hidden className="size-12 rounded-full bg-sky ring-8 ring-sky/25" />
      <p className="font-heading text-2xl font-bold tracking-tight">Nothing kept yet</p>
      <p className="text-pretty text-muted-foreground">Paste or drop a photo, a clip, a PDF or a link anywhere on this page. It will still be there when you look.</p>
    </div>
  );
}
