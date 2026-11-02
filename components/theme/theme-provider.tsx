"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { readPalette, paletteValue, persistPalette, type Palette } from "@/lib/palette";
import { persistTheme, readTheme, themePreference, resolvedTheme, type ThemePreference } from "@/lib/theme";

function preference() {
  const current = document.documentElement.dataset.themePreference;
  if (current) return themePreference(current);
  try { return readTheme(window.localStorage); } catch { return "dark" as const; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("kalend:theme", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("kalend:theme", listener); };
}
function subscribeSystem(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function subscribePalette(listener: () => void) { window.addEventListener("kalend:palette", listener); return () => window.removeEventListener("kalend:palette", listener); }
const ThemeContext = createContext<{ palette: Palette; setPalette: (value: Palette) => void; preference: ThemePreference; setPreference: (value: ThemePreference) => void } | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => { let next: ReturnType<typeof readPalette> = "gold"; try { next = readPalette(window.localStorage); } catch {} document.documentElement.dataset.palette = next; window.dispatchEvent(new Event("kalend:palette")); };
    apply(); window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, []);
  const palette = useSyncExternalStore(subscribePalette, () => paletteValue(document.documentElement.dataset.palette ?? null), () => "gold" as Palette);
  function setPalette(next: Palette) {
    try { persistPalette(window.localStorage, next); } catch {}
    document.documentElement.dataset.palette = next;
    window.dispatchEvent(new Event("kalend:palette"));
  }
  const value = useSyncExternalStore(subscribe, preference, () => "dark" as const);
  const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  function setPreference(next: ThemePreference) {
    try { persistTheme(window.localStorage, next); } catch { /* Storage may be unavailable. */ }
    document.documentElement.dataset.theme = resolvedTheme(next, window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.themePreference = next;
    window.dispatchEvent(new Event("kalend:theme"));
  }
  return <ThemeContext.Provider value={{ preference: value, setPreference, palette, setPalette }}><div className="kalend-theme-root" data-theme={value === "system" ? undefined : resolvedTheme(value, systemDark)}>{children}</div></ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider required");
  return context;
}
