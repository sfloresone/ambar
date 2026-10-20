import { SkeletonBlock } from "../../components/skeleton-swap.tsx";
import { MomentGrid } from "./moment-grid.tsx";
import { MOMENT_COLUMNS } from "./moments-view.ts";

/** Placeholder cards while the library loads, in the timeline's columns: the skeleton of its SkeletonSwap. */
export function LoadingGrid({ columns = 3 }: { columns?: keyof typeof MOMENT_COLUMNS }) {
  return (
    <MomentGrid columns={columns} label="Loading moments">
      {["aspect-4/5", "aspect-video", "aspect-3/4", "aspect-4/5", "aspect-square", "aspect-3/4"].map((ratio, index) => (
        <li key={`placeholder-${index}`} className="min-w-0 pb-5 @4xl:pb-6">
          <div className="rounded-3xl border border-border/70 bg-muted/35 p-1.5">
            <SkeletonBlock className={`${ratio} rounded-[1.125rem]`} />
            <div className="flex items-center gap-3 px-2 py-3">
              <SkeletonBlock className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonBlock className="h-3 w-3/4 rounded-sm" />
                <SkeletonBlock className="h-2 w-1/2 rounded-sm" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </MomentGrid>
  );
}
