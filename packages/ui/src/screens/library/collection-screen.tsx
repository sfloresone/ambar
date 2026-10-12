// One collection: its folder up top (name, how many), then its moments in time.
import type { Moment } from "@ambar/core";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import { cn } from "../../lib/utils.ts";
import { COLLECTION_TONE } from "./collection-tone.ts";
import { useLibrary } from "./library-context.tsx";
import { Timeline } from "./timeline.tsx";

type CollectionScreenProps = {
  collectionId: string;
  onOpenMoment: (moment: Moment) => void;
  onBack: () => void;
};

export function CollectionScreen({ collectionId, onOpenMoment, onBack }: CollectionScreenProps) {
  const { moments, collections } = useLibrary();
  const collection = collections.find((item) => item.id === collectionId);
  const inside = moments?.filter((moment) => moment.collectionIds.includes(collectionId)) ?? [];

  return (
    <div className="@container flex flex-col gap-8">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 rounded-full text-sm text-muted-foreground outline-hidden hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
      >
        <ArrowLeftIcon weight="bold" aria-hidden className="size-4" />
        Collections
      </button>

      {collection === undefined ? (
        moments !== null && <p className="text-muted-foreground">This collection doesn't exist anymore.</p>
      ) : (
        <>
          <header className="flex flex-col">
            <span aria-hidden className={cn("h-5 w-28 rounded-t-xl", COLLECTION_TONE[collection.tone])} />
            <div className={cn("flex items-end justify-between gap-4 rounded-3xl rounded-tl-none px-6 py-8", COLLECTION_TONE[collection.tone])}>
              <h1 className="text-4xl tracking-tight">{collection.name}</h1>
              <p className="text-sm">
                {inside.length} {inside.length === 1 ? "moment" : "moments"}
              </p>
            </div>
          </header>
          {inside.length === 0 ? (
            <p className="text-muted-foreground">Nothing here yet. Open a moment and add it to {collection.name}.</p>
          ) : (
            <Timeline moments={inside} onOpen={onOpenMoment} />
          )}
        </>
      )}

    </div>
  );
}
