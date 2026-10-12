// Collections: every folder, and a new one.
import type { Collection } from "@ambar/core";
import { useState } from "react";

import { PromptDialog } from "../../components/prompt-dialog.tsx";
import { CollectionCard, NewCollectionCard } from "./collection-card.tsx";
import { useLibrary } from "./library-context.tsx";

type CollectionsScreenProps = {
  onOpenCollection: (collection: Collection) => void;
};

export function CollectionsScreen({ onOpenCollection }: CollectionsScreenProps) {
  const { moments, collections, createCollection } = useLibrary();
  const [naming, setNaming] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <h1 tabIndex={-1} className="text-3xl tracking-tight">
        Collections
      </h1>
      <ul className="flex flex-wrap gap-6 pt-4">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionCard
              collection={collection}
              moments={(moments ?? []).filter((moment) => moment.collectionIds.includes(collection.id))}
              onOpen={onOpenCollection}
            />
          </li>
        ))}
        <li>
          <NewCollectionCard onCreate={() => setNaming(true)} />
        </li>
      </ul>
      <PromptDialog
        open={naming}
        onOpenChange={setNaming}
        title="New collection"
        label="Name"
        placeholder="Recipes, References, Sets…"
        submitLabel="Create"
        onSubmit={async (name) => {
          onOpenCollection(await createCollection(name));

          return undefined;
        }}
      />
    </div>
  );
}
