import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "warm" | "cold" | "tender-pink";

const THEMES: Theme[] = ["light", "dark", "warm", "cold", "tender-pink"];
const STORAGE_KEY = "email-analyzer-theme";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Apply theme whenever it changes
  useEffect(() => {
    const html = document.documentElement;

    // Remove all theme classes
    THEMES.forEach((t) => {
      html.classList.remove(`theme-${t}`);
    });

    // Add the selected theme class (always add it for proper CSS cascade)
    html.classList.add(`theme-${theme}`);
  }, [theme]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (savedTheme && THEMES.includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      setThemeState("light");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    if (THEMES.includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  };

  // Always provide the context - no early return that breaks context
  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
