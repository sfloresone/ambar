// Single choice among a few options (e.g. filter by kind). Look adapted from opensourceui "Segmented Control" (MIT);
// built on Base UI ToggleGroup for roving focus and arrow-key navigation.
import { cn } from "../lib/utils.ts";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState, type ReactNode } from "react";

import { SELECTED_RAISED, WELL } from "../lib/tactile.ts";

/** An icon-only segment: the label is its accessible name and tooltip. */
export type SegmentIcon = {
  label: string;
  icon: ReactNode;
};

type SegmentedControlProps = {
  options: string[];
  /** Accessible name of the group. */
  label: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Options shown as icons instead of text, by value. */
  icons?: Record<string, SegmentIcon>;
};

export function SegmentedControl({ options, label, defaultValue, onValueChange, icons }: SegmentedControlProps) {
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
      {options.map((option) => {
        const icon = icons?.[option];

        return (
          <Toggle
            key={option}
            value={option}
            aria-label={icon?.label}
            title={icon?.label}
            className={cn(
              "h-8 cursor-pointer rounded-lg text-muted-foreground outline-hidden select-none",
              icon === undefined ? "px-3.5" : "grid w-9 place-items-center [&_svg]:size-4",
              "transition-[color,background-color,box-shadow] duration-300 ease-settle motion-reduce:transition-none",
              "hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring",
              "data-pressed:bg-cloud data-pressed:text-ink",
              SELECTED_RAISED,
            )}
          >
            {icon === undefined ? option : icon.icon}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
}
