import type { Session } from "./auth.ts";
import type { Moment, MomentKind } from "./moment.ts";

export type UploadTarget = {
  uploadUrl: string;
  expiresAt: string;
};

/** The parts of a file the contract needs; platforms pass their own File/Blob that has them. */
export type MomentFile = {
  name: string;
  type: string;
  size: number;
};

/** Fraction uploaded, from 0 to 1. */
export type UploadProgress = (fraction: number) => void;

export interface UploadClient {
  /** Requests a signed URL to upload the media of a photo or clip. */
  getUploadUrl(kind: Exclude<MomentKind, "link">, contentType: string): Promise<UploadTarget>;
  /** Uploads a file for a signed-in user and returns the moment it became. */
  uploadMoment(file: MomentFile, session: Session, onProgress?: UploadProgress): Promise<Moment>;
}

export function momentKindOf(file: MomentFile): Exclude<MomentKind, "link"> {
  return file.type.startsWith("video/") ? "clip" : "photo";
}
