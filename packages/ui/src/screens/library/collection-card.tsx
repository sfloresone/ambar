// A collection as a real folder: its latest prints sit inside, behind a frosted-glass front cover, so only
// their tops peek out. Hover or keyboard focus tips the cover forward and raises the prints to show more.
// Chosen in the /dev lab ("folder peek", glass fading to solid). Folder look adapted from opensourceui's
// "Folder Tab Card" and "Stacked Folder Card" (MIT, github.com/bidyut10/opensourceui).
import { momentImage, type Collection, type Moment } from "@ambar/core";
import { PlusIcon } from "@phosphor-icons/react";

import { CollectionFolder } from "./collection-folder.tsx";

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
  // The three latest moments with an image. Each print takes its image's own shape: never cropped.
  const images: string[] = [];

  for (const moment of moments) {
    const src = momentImage(moment);

    if (src !== undefined) {
      images.push(src);
    }

    if (images.length === 3) {
      break;
    }
  }

  return (
    <button type="button" onClick={() => onOpen(collection)} aria-label={`${collection.name}, ${countLabel(moments.length)}`} className={CARD}>
      <CollectionFolder name={collection.name} count={moments.length} tone={collection.tone} images={images} />
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
