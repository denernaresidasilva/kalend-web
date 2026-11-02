"use client";
import { palettes, paletteValue } from "@/lib/palette";
import { useTheme } from "./theme-provider";
export function PaletteControl() {
  const { palette, setPalette } = useTheme();
  return <label className="k-palette-control">Paleta de cores<select value={palette} onChange={event => setPalette(paletteValue(event.target.value))}>{Object.entries(palettes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>Preferência de aparência deste navegador.</span></label>;
}
