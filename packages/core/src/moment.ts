/** Kinds of moment Ambar can keep, in the order every client lists them. */
export const MOMENT_KINDS = ["photo", "clip", "link", "file"] as const;

export type MomentKind = (typeof MOMENT_KINDS)[number];

/** The person who kept a moment, separate from the people it is shared with. */
export type MomentKeeper = {
  name: string;
  avatarUrl?: string;
};

type MomentBase = {
  id: string;
  createdAt: string;
  /** User ids the owner chose to share this moment with. Empty means private. */
  sharedWith: string[];
  keptBy?: MomentKeeper;
  /** Selected for the person's Canvas. */
  onCanvas?: boolean;
  note?: string;
  /** Shown on cards: the link's title, the file's name, or what Ambar read in the image. */
  title?: string;
  /** Where it came from: a domain ("behance.net") or an app ("Instagram"). */
  source?: string;
  /** What it is about, found by Ambar ("space", "cars"). Searchable, and suggests collections. */
  topics: string[];
  /** Words Ambar read in the image or document (OCR), for search. */
  readings?: string;
  /** Collections it belongs to; a moment can be in several. */
  collectionIds: string[];
  /** When it was moved to the Trash. Erased for good TRASH_DAYS later. */
  deletedAt?: string;
};

export type PhotoMoment = MomentBase & {
  kind: "photo";
  mediaUrl: string;
  width: number;
  height: number;
};

export type ClipMoment = MomentBase & {
  kind: "clip";
  mediaUrl: string;
  durationMs: number;
  /** First frame, for cards. */
  posterUrl?: string;
};

/**
 * How a link can be shown inside Ambar, decided by the server when the link is kept: "page" when the site
 * allows being framed (no X-Frame-Options / CSP frame-ancestors against it), "player" when the service has
 * an official embed (oEmbed: YouTube, SoundCloud, Vimeo, Spotify…). Always https.
 */
export type LinkEmbed = {
  kind: "page" | "player";
  url: string;
};

export type LinkMoment = MomentBase & {
  kind: "link";
  url: string;
  /** The page's subtitle (og:description), when it has one. */
  description?: string;
  /** The saved preview: a capture of the page, or its og:image. */
  imageUrl?: string;
  /** Absent: the site can't be shown inside Ambar; it opens in the browser instead. */
  embed?: LinkEmbed;
};

/** A document (PDF today). The server renders the first page and reads the text when it is kept. */
export type FileMoment = MomentBase & {
  kind: "file";
  mediaUrl: string;
  name: string;
  mimeType: string;
  size: number;
  pages?: number;
  /** First page as an image, for cards and the viewer. */
  previewUrl?: string;
};

export type Moment = PhotoMoment | ClipMoment | LinkMoment | FileMoment;

/** Maximum length of a clip, in milliseconds. */
export const MAX_CLIP_DURATION_MS = 30_000;

export function isPrivate(moment: Moment): boolean {
  return moment.sharedWith.length === 0;
}

/** The image that represents a moment on a card, if any. */
export function momentImage(moment: Moment): string | undefined {
  switch (moment.kind) {
    case "photo":
      return moment.mediaUrl;
    case "clip":
      return moment.posterUrl;
    case "link":
      return moment.imageUrl;
    case "file":
      return moment.previewUrl;
  }
}

/** A human label for the moment: its title, else something sensible per kind. */
export function momentLabel(moment: Moment): string {
  if (moment.title !== undefined && moment.title !== "") {
    return moment.title;
  }

  switch (moment.kind) {
    case "photo":
      return "Photo";
    case "clip":
      return "Clip";
    case "link":
      return moment.source ?? moment.url;
    case "file":
      return moment.name;
  }
}
