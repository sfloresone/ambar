/** A folder the user keeps moments in, the way they already think about them ("Recipes", "Car brands"). */
export type Collection = {
  id: string;
  name: string;
  createdAt: string;
  /** Folder color, from the palette. */
  tone: CollectionTone;
};

export const COLLECTION_TONES = ["sky", "leaf", "ink", "cloud"] as const;

export type CollectionTone = (typeof COLLECTION_TONES)[number];
