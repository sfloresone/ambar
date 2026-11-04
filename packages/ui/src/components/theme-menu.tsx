import { CheckIcon, DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";

import { cn } from "../lib/utils.ts";
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "./menu.tsx";
import { ThemeProvider, useTheme } from "./theme-provider.tsx";
import type { ThemePreference } from "../lib/theme.ts";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "System", icon: DesktopIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

function ThemeMenuContent() {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0]!;
  const Icon = current.icon;

  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={`Appearance: ${current.label}`}
        title={`Appearance: ${current.label}`}
        className={cn(
          "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border bg-background text-foreground outline-hidden",
          "transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
        )}
      >
        <Icon weight="bold" aria-hidden className="size-4" />
      </MenuTrigger>
      <MenuContent align="end">
        {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
          <MenuItem
            key={value}
            onClick={() => setPreference(value)}
            aria-label={preference === value ? `${label}, selected` : label}
            className="justify-between"
          >
            <span className="flex items-center gap-3">
              <OptionIcon weight="bold" aria-hidden />
              {label}
            </span>
            {preference === value && <CheckIcon weight="bold" aria-hidden className="text-link" />}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}

/** Standalone wrapper for Astro islands; each public page owns its local preference. */
export function ThemeMenu() {
  return (
    <ThemeProvider>
      <ThemeMenuContent />
    </ThemeProvider>
  );
}
