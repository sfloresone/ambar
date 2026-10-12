// What a moment can do outside Ambar: copy, download, open, share. The one place where platforms differ
// (a browser needs a user gesture to copy; desktop and mobile apps use native clipboards and save
// dialogs), so each app provides its own; this is the web implementation, and the default.
import { momentImage, momentLabel, type Moment } from "@ambar/core";
import { createContext, useContext } from "react";

/** What landed on the clipboard. */
export type Copied = "image" | "link";

export type PlatformActions = {
  /** Copy what represents the moment: its image, or its link. */
  copy: (moment: Moment) => Promise<Copied>;
  /** Save the original (photo, clip, document). Links have nothing to download. */
  download: (moment: Moment) => void;
  /** Open the original: the page for a link, the file otherwise. */
  open: (moment: Moment) => void;
  /** The system share sheet, where there is one. */
  share?: (moment: Moment) => Promise<void>;
};

/** Any image the browser can display, as PNG: the one image type every clipboard accepts. */
async function toPng(src: string): Promise<Blob> {
  const image = new Image();

  image.decoding = "async";
  image.src = src;
  await image.decode();

  const canvas = document.createElement("canvas");

  canvas.width = image.naturalWidth || 1200;
  canvas.height = image.naturalHeight || 1200;
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob === null ? reject(new Error("Could not encode the image.")) : resolve(blob)), "image/png");
  });
}

function originalUrl(moment: Moment): string {
  return moment.kind === "link" ? moment.url : moment.mediaUrl;
}

function fileName(moment: Moment): string {
  if (moment.kind === "file") {
    return moment.name;
  }

  const extension = moment.kind === "clip" ? "mp4" : "png";

  return `${momentLabel(moment).replaceAll(/[^\w\s-]/g, "").trim() || "moment"}.${extension}`;
}

export const webActions: PlatformActions = {
  copy(moment) {
    const image = momentImage(moment);

    if (moment.kind !== "link" && image !== undefined && "ClipboardItem" in window) {
      // The PNG is a promise inside the item: the write starts within the user's gesture (Safari requires
      // it) and the image encodes while the clipboard waits.
      return navigator.clipboard.write([new ClipboardItem({ "image/png": toPng(image) })]).then(() => "image");
    }

    return navigator.clipboard.writeText(originalUrl(moment)).then(() => "link");
  },
  download(moment) {
    if (moment.kind === "link") {
      return;
    }

    const anchor = document.createElement("a");

    anchor.href = moment.mediaUrl;
    anchor.download = fileName(moment);
    anchor.rel = "noreferrer";
    anchor.click();
  },
  open(moment) {
    window.open(originalUrl(moment), "_blank", "noopener,noreferrer");
  },
  share:
    typeof navigator !== "undefined" && "share" in navigator
      ? async (moment) => {
          await navigator.share({ title: momentLabel(moment), url: moment.kind === "link" ? moment.url : undefined });
        }
      : undefined,
};

const PlatformActionsContext = createContext<PlatformActions>(webActions);

export const PlatformActionsProvider = PlatformActionsContext.Provider;

export function usePlatformActions(): PlatformActions {
  return useContext(PlatformActionsContext);
}
