"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

declare global {
  interface Window {
    __setTheme?: (theme: Theme) => void;
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      return (root.dataset.theme as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<Theme>).detail;
      if (detail) {
        setTheme(detail);
      } else {
        const root = document.documentElement;
        setTheme((root.dataset.theme as Theme) || "light");
      }
    };

    window.addEventListener("themechange", handleThemeChange as EventListener);
    return () => {
      window.removeEventListener(
        "themechange",
        handleThemeChange as EventListener
      );
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    if (typeof window !== "undefined" && typeof window.__setTheme === "function") {
      window.__setTheme(nextTheme);
    } else {
      document.documentElement.dataset.theme = nextTheme;
    }
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={`Activate ${theme === "light" ? "dark" : "light"} mode`}
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        borderColor: "rgba(99, 102, 241, 0.4)",
      }}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      {/* {theme === "light" ? "Dark" : "Light"} mode */}
    </button>
  );
}

