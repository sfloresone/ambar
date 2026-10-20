import { SkeletonBlock } from "../../components/skeleton-swap.tsx";
import { MomentGrid } from "./moment-grid.tsx";
import { MOMENT_COLUMNS } from "./moments-view.ts";

/** Placeholder cards while the library loads, in the timeline's columns: the skeleton of its SkeletonSwap. */
export function LoadingGrid({ columns = 4 }: { columns?: keyof typeof MOMENT_COLUMNS }) {
  return (
    <MomentGrid columns={columns} label="Loading moments">
      {["aspect-4/5", "aspect-video", "aspect-3/4", "aspect-4/5", "aspect-square", "aspect-3/4"].map((ratio, index) => (
        <li key={`placeholder-${index}`} className="min-w-0 pb-5 @4xl:pb-6">
          <div className="relative rounded-2xl border border-border/60 bg-card p-1">
            <SkeletonBlock className={`${ratio} rounded-xl`} />
            <SkeletonBlock className="absolute -top-2 -left-2 size-7 rounded-full ring-3 ring-background" />
            <div className="flex items-center gap-1.5 px-1.5 py-2">
              <div className="min-w-0 flex-1"><SkeletonBlock className="h-3 w-3/4 rounded-sm" /></div>
              <SkeletonBlock className="size-8 rounded-lg" />
              <SkeletonBlock className="size-8 rounded-lg" />
            </div>
          </div>
        </li>
      ))}
    </MomentGrid>
  );
}
