// A collection as a real folder: its latest prints sit inside, behind a frosted-glass front cover, so only
// their tops peek out. Hover or keyboard focus tips the cover forward and raises the prints to show more.
// Chosen in the /dev lab ("folder peek", glass fading to solid). Folder look adapted from opensourceui's
// "Folder Tab Card" and "Stacked Folder Card" (MIT, github.com/bidyut10/opensourceui).
import { momentImage, type Collection, type Moment } from "@ambar/core";
import { PlusIcon } from "@phosphor-icons/react";

import { cn } from "../../lib/utils.ts";
import { COLLECTION_GLASS, COLLECTION_TONE } from "./collection-tone.ts";

const MOVE = "transition-transform duration-300 ease-out-soft motion-reduce:transition-none";

/**
 * Per print (left, middle, right): a fixed stacking order (the middle one in front, always) and a transform
 * at rest as well as on reveal. Without both, the untransformed middle print paints below the rotated ones
 * at rest and jumps above them the moment it starts moving.
 */
const RISE = [
  "z-1 translate-y-0 rotate-[-5deg] group-hover:-translate-y-12 group-hover:-rotate-[9deg] group-focus-visible:-translate-y-12 group-focus-visible:-rotate-[9deg]",
  "z-3 translate-y-0 rotate-0 group-hover:-translate-y-16 group-focus-visible:-translate-y-16",
  "z-2 translate-y-0 rotate-[5deg] group-hover:-translate-y-12 group-hover:rotate-[9deg] group-focus-visible:-translate-y-12 group-focus-visible:rotate-[9deg]",
];

const CARD =
  "group relative h-48 w-56 shrink-0 cursor-pointer rounded-2xl text-left outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-ring";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "moment" : "moments"}`;
}

type CollectionCardProps = {
  collection: Collection;
  /** Its moments, newest first. */
  moments: Moment[];
  onOpen: (collection: Collection) => void;
};

export function CollectionCard({ collection, moments, onOpen }: CollectionCardProps) {
  const tone = COLLECTION_TONE[collection.tone];

  // The three latest moments with an image. Each print takes its image's own shape: never cropped.
  const prints = moments
    .values()
    .map((moment) => ({ id: moment.id, src: momentImage(moment) }))
    .filter((print) => print.src !== undefined)
    .take(3)
    .toArray();

  return (
    <button type="button" onClick={() => onOpen(collection)} aria-label={`${collection.name}, ${countLabel(moments.length)}`} className={cn(CARD, "[perspective:900px]")}>
      {/* Back of the folder: tab and back panel, a shade darker than the cover. */}
      <span aria-hidden className="absolute inset-x-0 top-4 bottom-0 flex flex-col">
        <span className={cn("relative h-5 w-24 overflow-hidden rounded-t-xl after:absolute after:inset-0 after:bg-ink/15", tone)} />
        <span className={cn("relative flex-1 overflow-hidden rounded-2xl rounded-tl-none after:absolute after:inset-0 after:bg-ink/15", tone)} />
      </span>
      {/* The prints, inside. Sized so the fan always fits between the folder's sides, even opened. */}
      <span aria-hidden className="absolute inset-x-2 top-10 bottom-4 flex justify-center">
        {prints.map((print, index) => (
          <img
            key={print.id}
            src={print.src}
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
      {/* The front cover: frosted glass over the prints, solid where the name sits; tips forward to reveal. */}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex h-28 origin-bottom flex-col justify-end rounded-2xl border border-cloud/35 px-4 pb-3.5 backdrop-blur-md",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_-6px_16px_rgb(20_20_20/0.12)]",
          MOVE,
          "group-hover:[transform:rotateX(-22deg)] group-focus-visible:[transform:rotateX(-22deg)]",
          COLLECTION_GLASS[collection.tone],
        )}
      >
        <span className="font-heading text-lg leading-tight font-bold">{collection.name}</span>
        <span className="text-xs">{countLabel(moments.length)}</span>
      </span>
    </button>
  );
}

export function NewCollectionCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="mt-4 flex h-44 w-44 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground outline-hidden transition-colors hover:border-ink/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring"
    >
      <PlusIcon weight="bold" aria-hidden className="size-5" />
      New collection
    </button>
  );
}
