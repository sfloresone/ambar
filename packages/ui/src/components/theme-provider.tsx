import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { applyTheme, readThemePreference, writeThemePreference, type ThemePreference } from "../lib/theme.ts";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next);
    applyTheme(next);

    setPreferenceState(next);
  }, []);

  useEffect(() => {
    applyTheme(preference);

    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const onSystemChange = () => {
      if (preference === "system") {
        applyTheme("system", query.matches);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "ambar.theme") {
        const next = readThemePreference();

        setPreferenceState(next);
        applyTheme(next, query.matches);
      }
    };

    query.addEventListener("change", onSystemChange);

    window.addEventListener("storage", onStorage);

    return () => {
      query.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [preference]);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

