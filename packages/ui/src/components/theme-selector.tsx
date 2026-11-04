import { SegmentedControl } from "./segmented-control.tsx";
import { useTheme } from "./theme-provider.tsx";

const LABELS = { system: "System", light: "Light", dark: "Dark" } as const;

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  function select(value: string) {
    if (value === "system" || value === "light" || value === "dark") {
      setPreference(value);
    }
  }

  return (
    <SegmentedControl
      options={["system", "light", "dark"]}
      label="Color theme"
      value={preference}
      labels={LABELS}
      onValueChange={select}
    />
  );
}
