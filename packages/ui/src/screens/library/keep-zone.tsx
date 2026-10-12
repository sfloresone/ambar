// Keeping things: paste anywhere (an image, a link, a file), drop anywhere, or the "+ Keep" button.
// Nothing to fill in: Ambar names it, reads it and suggests a collection afterwards.
import { LinkIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "../../components/button.tsx";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../../components/menu.tsx";
import { PromptDialog } from "../../components/prompt-dialog.tsx";
import { useLibrary } from "./library-context.tsx";

const ACCEPT = "image/*,video/*,application/pdf";

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
}

function asUrl(text: string): string | null {
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

/** "+ Keep": upload a file or keep a link. */
export function KeepButton() {
  const { keep } = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [askingLink, setAskingLink] = useState(false);

  return (
    <>
      <MenuRoot>
        <MenuTrigger className={buttonVariants({ size: "md", className: "rounded-full" })}>
          <PlusIcon weight="bold" aria-hidden />
          Keep
        </MenuTrigger>
        <MenuContent align="end" className="min-w-52">
          <MenuItem onClick={() => input.current?.click()}>
            <UploadSimpleIcon weight="bold" aria-hidden />
            Photo, clip or PDF
          </MenuItem>
          <MenuItem onClick={() => setAskingLink(true)}>
            <LinkIcon weight="bold" aria-hidden />
            A link
          </MenuItem>
        </MenuContent>
      </MenuRoot>
      <PromptDialog
        open={askingLink}
        onOpenChange={setAskingLink}
        title="Keep a link"
        label="Link"
        type="url"
        placeholder="https://"
        submitLabel="Keep"
        onSubmit={(value) => {
          const url = asUrl(value);

          if (url === null) {
            return "That doesn't look like a link. It should start with https://";
          }

          void keep({ url });

          return undefined;
        }}
      />
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          [...(event.target.files ?? [])].forEach((file) => void keep({ file }));
          event.target.value = "";
        }}
      />
    </>
  );
}
