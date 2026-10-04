// Single choice among a few options (e.g. filter by kind). Look adapted from opensourceui "Segmented Control" (MIT);
// built on Base UI ToggleGroup for roving focus and arrow-key navigation.
import { cn } from "../lib/utils.ts";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState } from "react";

import { SELECTED_RAISED, WELL } from "../lib/tactile.ts";

type SegmentedControlProps = {
  options: string[];
  /** Accessible name of the group. */
  label: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export function SegmentedControl({ options, label, defaultValue, onValueChange }: SegmentedControlProps) {
  const [value, setValue] = useState(defaultValue ?? options[0] ?? "");

  function change(next: string[]) {
    // Single choice that can never be empty: ignore attempts to unpress the active segment.
    const picked = next[0];

    if (picked === undefined) {
      return;
    }

    setValue(picked);
    onValueChange?.(picked);
  }

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={change}
      aria-label={label}
      data-slot="segmented-control"
      className={cn("inline-flex gap-1 rounded-xl p-1 text-sm font-medium", WELL)}
    >
      {options.map((option) => (
        <Toggle
          key={option}
          value={option}
          className={cn(
            "h-8 cursor-pointer rounded-lg px-3.5 text-muted-foreground outline-hidden select-none",
            "transition-[color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            "hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring",
            "data-pressed:bg-cloud data-pressed:text-ink",
            SELECTED_RAISED,
          )}
        >
          {option}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
