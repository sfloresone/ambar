import { readItem, writeItem } from "./storage.ts";

export const THEME_STORAGE_KEY = "ambar.theme";

export type ThemePreference = "system" | "light" | "dark";

export function readThemePreference(): ThemePreference {
  const saved = readItem(THEME_STORAGE_KEY);

  if (saved === "light" || saved === "dark" || saved === "system") {
    return saved;
  }

  return "system";
}

export function writeThemePreference(preference: ThemePreference) {
  writeItem(THEME_STORAGE_KEY, preference);
}

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(preference: ThemePreference, dark = prefersDark()) {
  const isDark = preference === "dark" || (preference === "system" && dark);

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}
