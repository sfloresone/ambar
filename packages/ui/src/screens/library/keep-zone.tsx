// Keeping things without a form: paste anywhere (an image, a link, a file) or drop anywhere. Ambar names
// it, reads it and suggests a collection afterwards. The form, for tags and the rest, is KeepComposer.
import { useEffect, useState } from "react";

import { useLibrary } from "./library-context.tsx";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
}

/** An http(s) link from what was pasted or typed, or null. */
export function asUrl(text: string): string | null {
  try {
    const url = new URL(text.trim());

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Paste and drop handling for the whole page, plus the drop overlay. */
export function KeepZone() {
  const { keep } = useLibrary();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function paste(event: ClipboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const file = event.clipboardData?.files[0];
      const url = asUrl(event.clipboardData?.getData("text/plain") ?? "");

      if (file !== undefined) {
        event.preventDefault();
        void keep({ file });
      } else if (url !== null) {
        event.preventDefault();
        void keep({ url });
      }
    }

    function dragOver(event: DragEvent) {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        setDragging(true);
      }
    }

    function drop(event: DragEvent) {
      setDragging(false);

      const files = [...(event.dataTransfer?.files ?? [])];

      if (files.length > 0) {
        event.preventDefault();
        files.forEach((file) => void keep({ file }));
      }
    }

    function leave(event: DragEvent) {
      if (event.relatedTarget === null) {
        setDragging(false);
      }
    }

    window.addEventListener("paste", paste);
    window.addEventListener("dragover", dragOver);
    window.addEventListener("drop", drop);
    window.addEventListener("dragleave", leave);

    return () => {
      window.removeEventListener("paste", paste);
      window.removeEventListener("dragover", dragOver);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragleave", leave);
    };
  }, [keep]);

  return dragging ? (
    <div aria-hidden className="pointer-events-none fixed inset-3 z-60 grid place-items-center rounded-3xl border-2 border-dashed border-leaf bg-cloud/80 backdrop-blur-sm">
      <p className="font-heading text-3xl font-bold">Drop to keep</p>
    </div>
  ) : null;
}
