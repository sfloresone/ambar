// On/off setting, e.g. sharing a moment. Look adapted from opensourceui "Dimple Switch" (MIT);
// built on Base UI Switch for role="switch", keyboard and form support.
import { cn } from "../lib/utils.ts";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { useId } from "react";

import { RAISED_LIGHT, WELL } from "../lib/tactile.ts";

type SwitchProps = {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ label, defaultChecked = false, disabled = false, onCheckedChange }: SwitchProps) {
  // aria-labelledby names the switch in server-rendered HTML too; a <label> cannot name a role="switch" span.
  const labelId = useId();

  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium has-data-disabled:cursor-not-allowed has-data-disabled:opacity-40">
      <SwitchPrimitive.Root
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        data-slot="switch"
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 outline-hidden",
          "transition-[background-color] duration-300 motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
          WELL,
          "data-checked:bg-leaf",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "size-6 rounded-full bg-cloud",
            RAISED_LIGHT,
            "transition-transform duration-300 ease-spring motion-reduce:transition-none",
            "data-checked:translate-x-5",
          )}
        />
      </SwitchPrimitive.Root>
      <span id={labelId}>{label}</span>
    </label>
  );
}
