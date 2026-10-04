// Drop or choose a photo or a short clip. Built on react-dropzone (headless); the look is the tactile well.
import { MAX_CLIP_DURATION_MS } from "@ambar/core";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useDropzone, type FileError, type FileRejection } from "react-dropzone";

import { WELL } from "../lib/tactile.ts";
import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const MESSAGES = {
  "file-invalid-type": "Only photos and clips for now.",
  "file-too-large": "That file is over 100 MB.",
  "too-many-files": "One moment at a time.",
  "clip-too-long": `Clips can be up to ${MAX_CLIP_DURATION_MS / 1000} seconds.`,
} as const;

type MessageCode = keyof typeof MESSAGES;

function isMessageCode(code: string): code is MessageCode {
  return Object.hasOwn(MESSAGES, code);
}

function readDurationMs(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration * 1000);
    };

    // Unreadable metadata: let it through rather than block a valid clip.
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };

    video.src = url;
  });
}

async function validateClipLength(file: File): Promise<FileError | null> {
  if (!file.type.startsWith("video/")) {
    return null;
  }

  const durationMs = await readDurationMs(file);

  return durationMs > MAX_CLIP_DURATION_MS ? { code: "clip-too-long", message: MESSAGES["clip-too-long"] } : null;
}

function rejectionMessage(rejections: readonly FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;

  if (code === undefined) {
    return "";
  }

  return isMessageCode(code) ? MESSAGES[code] : "That file can't be kept.";
}

type DropzoneProps = {
  onFileAccepted: (file: File) => void;
  className?: string;
};

export function Dropzone({ onFileAccepted, className }: DropzoneProps) {
  const { getRootProps, getInputProps, open, isDragActive, isDragReject, isProcessing, fileRejections } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    maxFiles: 1,
    multiple: false,
    maxSize: MAX_FILE_BYTES,
    // Keyboard and click go through the explicit button below, which is a real <button>.
    noClick: true,
    noKeyboard: true,
    validator: validateClipLength,
    onDropAccepted: (files) => {
      const file = files[0];

      if (file !== undefined) {
        onFileAccepted(file);
      }
    },
  });

  const error = rejectionMessage(fileRejections);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        {...getRootProps({
          "aria-label": "Drop a photo or a short clip",
          role: "group",
        })}
        data-slot="dropzone"
        data-drag-active={isDragActive || undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-3xl px-6 py-10 text-center",
          "transition-[box-shadow,background-color] duration-200 motion-reduce:transition-none",
          WELL,
          isDragActive && !isDragReject && "bg-leaf/10 ring-2 ring-leaf",
          isDragReject && "ring-2 ring-destructive",
        )}
      >
        <input {...getInputProps()} />
        <UploadSimpleIcon weight="bold" aria-hidden className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{isDragActive ? "Let it go" : "Drop a photo or a short clip"}</p>
          <p className="text-sm text-muted-foreground">Up to {MAX_CLIP_DURATION_MS / 1000} seconds for clips.</p>
        </div>
        <Button tone="cloud" loading={isProcessing} onClick={open}>
          Choose a file
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
        {error}
      </p>
    </div>
  );
}
