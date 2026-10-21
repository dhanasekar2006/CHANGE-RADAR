import { useCallback, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const KEY = "vilaiwatch.theme";

function read(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(theme: ThemePreference) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** Applies the saved preference at startup (called from main.tsx before first render). */
export function initTheme() {
  apply(read());
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(read);
  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this visit.
    }
  }, []);
  return { theme, setTheme };
}
