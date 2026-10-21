// Copies a value or runs a platform action, then confirms the result inline. Adapted from opensourceui "Copy to Clipboard" (MIT).
import { cn } from "../lib/utils.ts";
import { CheckIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import { PRESS_ACTIVE, TACTILE_BASE, TONE } from "../lib/tactile.ts";

type CopyButtonProps = Omit<ComponentProps<"button">, "value" | "children" | "onClick"> & {
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
} & ({ value: string; onCopy?: never } | { value?: never; onCopy: () => Promise<boolean | void> });

const RESET_MS = 1600;

const LAYER = "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none";

export function CopyButton({ value, onCopy, label = "Copy link", copiedLabel = "Copied", failedLabel = "Couldn't copy", className, ...props }: CopyButtonProps) {
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  async function copy() {
    try {
      const result = onCopy === undefined ? await navigator.clipboard.writeText(value) : await onCopy();

      if (result === false) {
        setStatus("failed");
      } else {
        setStatus("copied");
      }
    } catch {
      setStatus("failed");
    }

    if (timer.current !== null) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => setStatus(null), RESET_MS);
  }

  const copied = status === "copied";
  const feedback = copied ? copiedLabel : status === "failed" ? failedLabel : "";

  return (
    <button
      type="button"
      data-slot="copy-button"
      data-copied={copied || undefined}
      onClick={copy}
      className={cn(TACTILE_BASE, "h-10 gap-2 rounded-xl px-4 text-sm [&_svg]:size-4", TONE.cloud, PRESS_ACTIVE, className)}
      {...props}
    >
      <span className="grid">
        <LinkSimpleIcon weight="bold" aria-hidden className={cn(LAYER, copied && "opacity-0")} />
        <CheckIcon weight="bold" aria-hidden className={cn(LAYER, "text-link", !copied && "opacity-0")} />
      </span>
      <span className="grid">
        <span aria-hidden={status !== null} className={cn(LAYER, status !== null && "opacity-0")}>
          {label}
        </span>
        <span aria-hidden={status === null} className={cn(LAYER, copied ? "text-link" : "text-destructive", status === null && "opacity-0")}>
          {feedback}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {feedback}
      </span>
    </button>
  );
}
