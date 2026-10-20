import { SkeletonBlock } from "../../components/skeleton-swap.tsx";

/** Placeholder cards while the library loads, in the timeline's columns: the skeleton of its SkeletonSwap. */
export function LoadingGrid() {
  return (
    <div className="columns-2 gap-4 @2xl:columns-3 @4xl:columns-4">
      {["aspect-4/5", "aspect-video", "aspect-3/4", "aspect-4/5", "aspect-square", "aspect-3/4"].map((ratio, index) => (
        <SkeletonBlock key={`placeholder-${index}`} className={`mb-4 ${ratio} rounded-2xl`} />
      ))}
    </div>
  );
}
