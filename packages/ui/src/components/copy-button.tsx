// Copies a link and confirms it. Adapted from opensourceui "Copy to Clipboard" (MIT).
import { cn } from "../lib/utils.ts";
import { CheckIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ComponentProps } from "react";

import { PRESS_ACTIVE, TACTILE_BASE, TONE } from "../lib/tactile.ts";

type CopyButtonProps = Omit<ComponentProps<"button">, "value" | "children"> & {
  value: string;
  label?: string;
  copiedLabel?: string;
};

const RESET_MS = 1600;

const LAYER = "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none";

export function CopyButton({ value, label = "Copy link", copiedLabel = "Copied", className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
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
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the label still confirms the intent.
    }

    setCopied(true);

    if (timer.current !== null) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => setCopied(false), RESET_MS);
  }

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
        <CheckIcon weight="bold" aria-hidden className={cn(LAYER, "text-leaf", !copied && "opacity-0")} />
      </span>
      <span className="grid">
        <span aria-hidden={copied} className={cn(LAYER, copied && "opacity-0")}>
          {label}
        </span>
        <span aria-hidden={!copied} className={cn(LAYER, "text-leaf", !copied && "opacity-0")}>
          {copiedLabel}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}
