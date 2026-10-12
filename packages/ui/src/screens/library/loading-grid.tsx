/** Placeholder cards while the library loads, in the timeline's columns. */
export function LoadingGrid() {
  return (
    <div aria-hidden className="columns-2 gap-4 @2xl:columns-3 @4xl:columns-4">
      {["aspect-4/5", "aspect-video", "aspect-3/4", "aspect-4/5", "aspect-square", "aspect-3/4"].map((ratio, index) => (
        <div key={`placeholder-${index}`} className={`mb-4 ${ratio} animate-pulse rounded-2xl bg-muted motion-reduce:animate-none`} />
      ))}
    </div>
  );
}
