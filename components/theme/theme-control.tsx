"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { IconButton } from "@/components/ui/icon-button";
export function ThemeControl() {
  const { preference, setPreference } = useTheme();
  const dark = preference === "dark" || (preference === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const label = dark ? "Ativar modo claro" : "Ativar modo escuro";
  return <IconButton className="k-theme-control" aria-label={label} title={label} onClick={() => setPreference(dark ? "light" : "dark")}>{dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}</IconButton>;
}
