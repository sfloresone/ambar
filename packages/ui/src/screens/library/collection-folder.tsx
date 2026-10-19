// The shared folder artwork used by Collections and the landing. Adapted from opensourceui's
// "Folder Tab Card" and "Stacked Folder Card" (MIT, github.com/bidyut10/opensourceui).
import type { CollectionTone } from "@ambar/core";

import { cn } from "../../lib/utils.ts";
import { COLLECTION_GLASS, COLLECTION_TONE } from "./collection-tone.ts";

const MOVE =
  "transition-transform duration-300 ease-out-soft group-focus-visible:transition-none motion-reduce:transition-none";

// The middle print stays above the others at rest and on reveal.
const RISE = [
  "z-1 rotate-[-5deg] motion-safe:group-hover:-translate-y-12 motion-safe:group-hover:-rotate-[9deg] motion-safe:group-focus-visible:-translate-y-12 motion-safe:group-focus-visible:-rotate-[9deg]",
  "z-3 rotate-0 motion-safe:group-hover:-translate-y-16 motion-safe:group-focus-visible:-translate-y-16",
  "z-2 rotate-[5deg] motion-safe:group-hover:-translate-y-12 motion-safe:group-hover:rotate-[9deg] motion-safe:group-focus-visible:-translate-y-12 motion-safe:group-focus-visible:rotate-[9deg]",
];

type CollectionFolderProps = {
  name: string;
  count: number;
  tone: CollectionTone;
  images: readonly string[];
};

/** Decorative artwork. Its parent supplies an accessible label and any interaction. */
export function CollectionFolder({
  name,
  count,
  tone,
  images,
}: CollectionFolderProps) {
  const fill = COLLECTION_TONE[tone];

  return (
    <span
      aria-hidden
      data-slot="collection-folder"
      className="group relative block h-48 w-56 shrink-0 [perspective:900px]"
    >
      <span className="absolute inset-x-0 top-4 bottom-0 flex flex-col">
        <span
          className={cn(
            "relative h-5 w-24 overflow-hidden rounded-t-xl after:absolute after:inset-0 after:bg-ink/15",
            fill,
          )}
        />
        <span
          className={cn(
            "relative flex-1 overflow-hidden rounded-2xl rounded-tl-none after:absolute after:inset-0 after:bg-ink/15",
            fill,
          )}
        />
      </span>
      <span className="absolute inset-x-2 top-10 bottom-4 flex justify-center">
        {images.slice(0, 3).map((src, index) => (
          <img
            key={`${index}-${src}`}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              "relative -mx-5 h-auto max-h-28 w-auto max-w-22 self-start rounded-md border-[3px] border-cloud bg-cloud shadow-[0_4px_12px_rgb(20_20_20/0.2)]",
              MOVE,
              RISE[index],
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex h-28 origin-bottom flex-col justify-end rounded-2xl border border-cloud/35 px-4 pb-3.5 backdrop-blur-md",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_-6px_16px_rgb(20_20_20/0.12)]",
          MOVE,
          "motion-safe:group-hover:[transform:rotateX(-22deg)] motion-safe:group-focus-visible:[transform:rotateX(-22deg)]",
          COLLECTION_GLASS[tone],
        )}
      >
        <span className="font-heading text-lg leading-tight font-bold">
          {name}
        </span>
        <span className="text-xs">
          {count} {count === 1 ? "moment" : "moments"}
        </span>
      </span>
    </span>
  );
}
