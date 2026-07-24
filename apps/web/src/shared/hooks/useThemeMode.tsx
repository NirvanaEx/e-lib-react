import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeStyle = "glass" | "standard";

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
  glassOpacity: number;
  setGlassOpacity: (value: number) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const MODE_KEY = "theme-mode";
const STYLE_KEY = "theme-style";
const OPACITY_KEY = "glass-opacity";

// Transparency slider bounds (percent, higher = more see-through).
export const GLASS_OPACITY_MIN = 10;
export const GLASS_OPACITY_MAX = 90;
export const GLASS_OPACITY_DEFAULT = 60;

export function clampGlassOpacity(value: number) {
  if (!Number.isFinite(value)) return GLASS_OPACITY_DEFAULT;
  return Math.min(GLASS_OPACITY_MAX, Math.max(GLASS_OPACITY_MIN, Math.round(value)));
}

// Panel background alpha for the given transparency percent.
export function glassSurfaceAlpha(mode: ThemeMode, transparency: number) {
  const k = (clampGlassOpacity(transparency) - GLASS_OPACITY_MIN) / (GLASS_OPACITY_MAX - GLASS_OPACITY_MIN);
  return mode === "dark" ? 0.42 - 0.36 * k : 0.85 - 0.6 * k;
}

function readStoredMode(): ThemeMode {
  return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
}

// Liquid glass is the default look; "standard" is the opt-out.
function readStoredStyle(): ThemeStyle {
  return localStorage.getItem(STYLE_KEY) === "standard" ? "standard" : "glass";
}

function readStoredOpacity(): number {
  return clampGlassOpacity(Number(localStorage.getItem(OPACITY_KEY) ?? GLASS_OPACITY_DEFAULT));
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [style, setStyleState] = useState<ThemeStyle>(readStoredStyle);
  const [glassOpacity, setGlassOpacityState] = useState<number>(readStoredOpacity);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style);
    localStorage.setItem(STYLE_KEY, style);
  }, [style]);

  // index.css reads these vars inside the rgba() of --surface/--surface-2.
  useEffect(() => {
    localStorage.setItem(OPACITY_KEY, String(glassOpacity));
    const root = document.documentElement;
    if (style === "glass") {
      const alpha = glassSurfaceAlpha(mode, glassOpacity);
      root.style.setProperty("--glass-alpha", alpha.toFixed(3));
      root.style.setProperty("--glass-alpha-2", (alpha * 0.75).toFixed(3));
    } else {
      root.style.removeProperty("--glass-alpha");
      root.style.removeProperty("--glass-alpha-2");
    }
  }, [style, mode, glassOpacity]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggleMode = useCallback(() => setModeState((prev) => (prev === "light" ? "dark" : "light")), []);
  const setStyle = useCallback((next: ThemeStyle) => setStyleState(next), []);
  const setGlassOpacity = useCallback((next: number) => setGlassOpacityState(clampGlassOpacity(next)), []);

  const value = useMemo(
    () => ({ mode, toggleMode, setMode, style, setStyle, glassOpacity, setGlassOpacity }),
    [mode, toggleMode, setMode, style, setStyle, glassOpacity, setGlassOpacity]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return ctx;
}
