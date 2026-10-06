// Preview of a kept file, sized for display. Phone photos are 12 MP or more: showing the original means
// decoding it on the main thread (a ~100 ms frame) and holding it in memory just to draw it at ~500 px.

/** Longest edge of an image preview, in pixels. Twice the dialog width covers retina screens. */
const PREVIEW_MAX_EDGE = 1200;

export type MomentPreview =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  /** The browser can't decode it (e.g. HEIC outside Safari). The file is still kept. */
  | { kind: "unsupported" };

function scaledSize(width: number, height: number) {
  const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(width, height));

  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
}

async function imagePreview(file: File): Promise<MomentPreview> {
  let bitmap: ImageBitmap;

  try {
    // Decodes off the main thread where supported; rejects for formats the browser can't read.
    bitmap = await createImageBitmap(file);
  } catch {
    return { kind: "unsupported" };
  }

  const size = scaledSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");

  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await canvasToBlob(canvas);

  return blob === null ? { kind: "unsupported" } : { kind: "image", url: URL.createObjectURL(blob) };
}

/** Builds a display-sized preview. The caller owns the returned URL and must revoke it. */
export async function createMomentPreview(file: File): Promise<MomentPreview> {
  if (file.type.startsWith("video/")) {
    // Codec support is only known once the <video> tries to play; the component falls back on error.
    return { kind: "video", url: URL.createObjectURL(file) };
  }

  return imagePreview(file);
}

export function revokeMomentPreview(preview: MomentPreview) {
  if (preview.kind !== "unsupported") {
    URL.revokeObjectURL(preview.url);
  }
}
