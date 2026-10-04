import type { MomentKind } from "./moment.ts";

export type UploadTarget = {
  uploadUrl: string;
  expiresAt: string;
};

/** Requests a signed URL to upload the media of a photo or clip. */
export interface UploadClient {
  getUploadUrl(kind: Exclude<MomentKind, "link">, contentType: string): Promise<UploadTarget>;
}
