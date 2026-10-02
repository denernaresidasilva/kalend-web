"use client";
import { useId } from "react";
import { useTheme } from "./theme-provider";
import type { ThemePreference } from "@/lib/theme";
export function ThemeControl() {
  const id = useId();
  const { preference, setPreference } = useTheme();
  return <label className="k-theme-control" htmlFor={id}><span>Aparência</span><select id={id} value={preference} onChange={event => setPreference(event.target.value as ThemePreference)}><option value="light">Claro</option><option value="dark">Escuro</option><option value="system">Sistema</option></select></label>;
}
