import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeName = "dark" | "light";
export type AccentName = "indigo" | "neon" | "gold";

export const ACCENT_OPTIONS: { name: AccentName; label: string; color: string }[] = [
  { name: "indigo", label: "靛蓝", color: "#6366f1" },
  { name: "neon", label: "霓虹", color: "#22d3ee" },
  { name: "gold", label: "鎏金", color: "#f59e0b" },
];

interface ThemeCtx {
  theme: ThemeName;
  accent: AccentName;
  setTheme: (t: ThemeName) => void;
  setAccent: (a: AccentName) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("astra-frontline-theme");
    return saved === "light" ? "light" : "dark";
  });
  const [accent, setAccent] = useState<AccentName>(() => {
    const saved = localStorage.getItem("astra-frontline-accent") as AccentName | null;
    return saved && ACCENT_OPTIONS.some((a) => a.name === saved)
      ? saved
      : "indigo";
  });

  useEffect(() => {
    localStorage.setItem("astra-frontline-theme", theme);
    localStorage.setItem("astra-frontline-accent", accent);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-accent", accent);
  }, [theme, accent]);

  const value: ThemeCtx = {
    theme,
    accent,
    setTheme,
    setAccent,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
