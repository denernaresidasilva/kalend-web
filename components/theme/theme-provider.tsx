"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { persistTheme, readTheme, themePreference, resolvedTheme, type ThemePreference } from "@/lib/theme";

function preference() {
  const current = document.documentElement.dataset.themePreference;
  if (current) return themePreference(current);
  try { return readTheme(window.localStorage); } catch { return "system" as const; }
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
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void } | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useSyncExternalStore(subscribe, preference, () => "system" as const);
  const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  function setPreference(next: ThemePreference) {
    try { persistTheme(window.localStorage, next); } catch { /* Storage may be unavailable. */ }
    document.documentElement.dataset.theme = resolvedTheme(next, window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.themePreference = next;
    window.dispatchEvent(new Event("kalend:theme"));
  }
  return <ThemeContext.Provider value={{ preference: value, setPreference }}><div className="kalend-theme-root" data-theme={value === "system" ? undefined : resolvedTheme(value, systemDark)}>{children}</div></ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider required");
  return context;
}
