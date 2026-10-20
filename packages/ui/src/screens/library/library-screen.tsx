// Moments: everything kept, in time, laid out as the person likes (2×2, 3×3, 4×4, or the list with its
// preview panel). Search lives in the global palette (⌘K); keeping lives here (+ Keep, or paste and drop
// anywhere). Platform-free: opening a moment is a callback.
import type { Moment } from "@ambar/core";
import { ListBulletsIcon } from "@phosphor-icons/react";

import { SegmentedControl, type SegmentIcon } from "../../components/segmented-control.tsx";
import { KeepButton, KeepZone } from "./keep-zone.tsx";
import { useLibrary } from "./library-context.tsx";
import { SkeletonSwap } from "../../components/skeleton-swap.tsx";
import { LoadingGrid } from "./loading-grid.tsx";
import { MomentList } from "./moment-list.tsx";
import { MOMENTS_VIEWS, useMomentsView, type MomentsView } from "./moments-view.ts";
import { Timeline } from "./timeline.tsx";

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

type LibraryScreenProps = {
  onOpenMoment: (moment: Moment) => void;
};

export function LibraryScreen({ onOpenMoment }: LibraryScreenProps) {
  const { moments } = useLibrary();
  const { view, setView } = useMomentsView();

  return (
    <div className="@container flex flex-col gap-8">
      <KeepZone />
      <header className="flex flex-wrap items-center justify-between gap-4">
        {/* Also where focus lands after the iris opens. */}
        <h1 tabIndex={-1} className="text-3xl tracking-tight">
          Moments
        </h1>
        <div className="flex items-center gap-3">
          <SegmentedControl options={[...MOMENTS_VIEWS]} icons={VIEW_ICONS} label="Layout" defaultValue={view} onValueChange={setView} />
          <KeepButton />
        </div>
      </header>

      {/* The grid's place is held while loading, then the moments fade in where the placeholders were. */}
      <SkeletonSwap ready={moments !== null} label="Moments" skeleton={<LoadingGrid />} className={moments === null ? "min-h-[60svh]" : undefined}>
        {moments?.length === 0 && <EmptyLibrary />}
        {moments !== null &&
          moments.length > 0 &&
          (view === "list" ? <MomentList moments={moments} onOpen={onOpenMoment} /> : <Timeline moments={moments} onOpen={onOpenMoment} columns={GRID_COLUMNS[view]} />)}
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
