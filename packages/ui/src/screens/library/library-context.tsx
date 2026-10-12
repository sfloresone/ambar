// The library's state for a screen: moments, the Trash and collections from a LibraryClient (mock today),
// and the actions that change them. Keeping something offers its suggested collection with one tap;
// deleting moves it to the Trash and offers Undo.
import { momentLabel, type AskResult, type Collection, type KeepInput, type LibraryClient, type Moment } from "@ambar/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useToast } from "../../components/toaster.tsx";

type Library = {
  /** Kept moments; null while loading. */
  moments: Moment[] | null;
  /** Moments in the Trash, most recently deleted first; null while loading. */
  trash: Moment[] | null;
  collections: Collection[];
  /** Calls the agent: only when the person asks for it, never while searching. */
  ask: (query: string) => Promise<AskResult>;
  keep: (input: KeepInput<File>) => Promise<void>;
  setCollections: (momentId: string, collectionIds: string[]) => Promise<void>;
  createCollection: (name: string) => Promise<Collection>;
  moveToTrash: (moment: Moment) => Promise<void>;
  restore: (momentId: string) => Promise<void>;
  purge: (momentId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
};

const LibraryContext = createContext<Library | null>(null);

type LibraryProviderProps = {
  client: LibraryClient<File>;
  children: ReactNode;
};

const byNewest = (a: Moment, b: Moment) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

export function LibraryProvider({ client, children }: LibraryProviderProps) {
  const toast = useToast();
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [trash, setTrash] = useState<Moment[] | null>(null);
  const [collections, setCollectionsList] = useState<Collection[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([client.listMoments(), client.listTrash(), client.listCollections()]).then(([nextMoments, nextTrash, nextCollections]) => {
      if (active) {
        setMoments(nextMoments);
        setTrash(nextTrash);
        setCollectionsList(nextCollections);
      }
    });

    return () => {
      active = false;
    };
  }, [client]);

  const setCollections = useCallback(
    async (momentId: string, collectionIds: string[]) => {
      const updated = await client.setCollections(momentId, collectionIds);

      setMoments((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated]);
    },
    [client],
  );

  const keep = useCallback(
    async (input: KeepInput<File>) => {
      const { moment, suggestion } = await client.keep(input);

      setMoments((current) => [moment, ...(current ?? [])]);

      const id = toast.add({
        title: "Kept.",
        description: suggestion === undefined ? "It's in your moments." : `Looks like ${suggestion.name}.`,
        actionProps:
          suggestion === undefined
            ? undefined
            : {
                children: `Add to ${suggestion.name}`,
                onClick: () => {
                  void setCollections(moment.id, [suggestion.id]);
                  toast.close(id);
                },
              },
      });
    },
    [client, setCollections, toast],
  );

  const restore = useCallback(
    async (momentId: string) => {
      const restored = await client.restoreMoment(momentId);

      setTrash((current) => current?.filter((item) => item.id !== momentId) ?? null);
      setMoments((current) => [...(current ?? []), restored].toSorted(byNewest));
    },
    [client],
  );

  const moveToTrash = useCallback(
    async (moment: Moment) => {
      const trashed = await client.deleteMoment(moment.id);

      setMoments((current) => current?.filter((item) => item.id !== moment.id) ?? null);
      setTrash((current) => [trashed, ...(current ?? [])]);

      const id = toast.add({
        title: "Moved to Trash",
        description: momentLabel(moment),
        actionProps: {
          children: "Undo",
          onClick: () => {
            void restore(moment.id);
            toast.close(id);
          },
        },
      });
    },
    [client, restore, toast],
  );

  const value = useMemo<Library>(
    () => ({
      moments,
      trash,
      collections,
      ask: (query) => client.ask(query),
      keep,
      setCollections,
      async createCollection(name) {
        const collection = await client.createCollection(name);

        setCollectionsList((current) => [...current, collection]);

        return collection;
      },
      moveToTrash,
      restore,
      async purge(momentId) {
        await client.purgeMoment(momentId);
        setTrash((current) => current?.filter((item) => item.id !== momentId) ?? null);
      },
      async emptyTrash() {
        await client.emptyTrash();
        setTrash([]);
      },
    }),
    [client, collections, keep, moments, moveToTrash, restore, setCollections, trash],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): Library {
  const library = useContext(LibraryContext);

  if (library === null) {
    throw new Error("useLibrary needs a LibraryProvider above it.");
  }

  return library;
}
