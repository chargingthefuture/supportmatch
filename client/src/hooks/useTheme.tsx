import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");
  const [isInitialized, setIsInitialized] = useState(false);

  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const updateTheme = (newTheme: Theme) => {
    let resolvedTheme: "light" | "dark";
    
    if (newTheme === "system") {
      resolvedTheme = getSystemTheme();
    } else {
      resolvedTheme = newTheme;
    }

    setActualTheme(resolvedTheme);

    // Apply theme to document (only on client-side)
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (resolvedTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    // Store theme preference (only on client-side)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const initializeTheme = () => {
      const stored = localStorage.getItem("theme") as Theme;
      const initialTheme = stored || "system";
      setTheme(initialTheme);
      updateTheme(initialTheme);
      setIsInitialized(true);
    };

    initializeTheme();
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (isInitialized) {
      updateTheme(theme);
    }

    // Listen for system theme changes when theme is set to "system"
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, isInitialized]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    updateTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: handleSetTheme,
      actualTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};