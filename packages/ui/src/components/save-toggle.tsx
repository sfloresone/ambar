// Keeps or un-keeps a moment. Adapted from opensourceui "Bookmark Save" (MIT), on Base UI Toggle.
import { cn } from "../lib/utils.ts";
import { Toggle } from "@base-ui/react/toggle";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { PRESS_ACTIVE, PRESS_LATCHED, TACTILE_BASE, TONE } from "../lib/tactile.ts";

type SaveToggleProps = {
  defaultSaved?: boolean;
  label?: string;
  savedLabel?: string;
  onSavedChange?: (saved: boolean) => void;
};

const LAYER = "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none";

export function SaveToggle({ defaultSaved = false, label = "Keep", savedLabel = "Kept", onSavedChange }: SaveToggleProps) {
  const [saved, setSaved] = useState(defaultSaved);

  function change(next: boolean) {
    setSaved(next);
    onSavedChange?.(next);
  }

  return (
    <Toggle
      pressed={saved}
      onPressedChange={change}
      aria-label={label}
      data-slot="save-toggle"
      className={cn(
        TACTILE_BASE,
        "h-10 gap-2 rounded-xl px-4 text-sm [&_svg]:size-4",
        TONE.cloud,
        PRESS_ACTIVE,
        PRESS_LATCHED,
        "data-pressed:bg-leaf data-pressed:text-cloud",
      )}
    >
      <BookmarkSimpleIcon
        weight={saved ? "fill" : "bold"}
        aria-hidden
        className="transition-transform duration-300 ease-spring motion-reduce:transition-none in-data-pressed:scale-110"
      />
      <span className="grid">
        <span aria-hidden className={cn(LAYER, saved && "opacity-0")}>
          {label}
        </span>
        <span aria-hidden className={cn(LAYER, !saved && "opacity-0")}>
          {savedLabel}
        </span>
      </span>
    </Toggle>
  );
}
