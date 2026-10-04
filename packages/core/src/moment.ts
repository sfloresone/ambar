/** Kinds of moment Ámbar can keep. */
export type MomentKind = "photo" | "clip" | "link";

type MomentBase = {
  id: string;
  createdAt: string;
  /** User ids the owner chose to share this moment with. Empty means private. */
  sharedWith: string[];
  note?: string;
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
};

export type LinkMoment = MomentBase & {
  kind: "link";
  url: string;
  title?: string;
};

export type Moment = PhotoMoment | ClipMoment | LinkMoment;

/** Maximum length of a clip, in milliseconds. */
export const MAX_CLIP_DURATION_MS = 30_000;

export function isPrivate(moment: Moment): boolean {
  return moment.sharedWith.length === 0;
}
