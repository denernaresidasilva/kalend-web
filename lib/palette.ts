export const paletteKey = "kalend:palette";
export const palettes = { gold: "Dourado", ocean: "Oceano", emerald: "Esmeralda", rose: "Rosa", violet: "Violeta", ruby: "Rubi", coral: "Coral", amber: "Âmbar", olive: "Oliva", forest: "Floresta", teal: "Turquesa", cyan: "Ciano", sky: "Céu", indigo: "Índigo", lavender: "Lavanda", plum: "Ameixa", magenta: "Magenta", wine: "Vinho", copper: "Cobre", slate: "Ardósia" } as const;
export type Palette = keyof typeof palettes;
export function paletteValue(value: string | null): Palette { return value && Object.hasOwn(palettes, value) ? value as Palette : "gold"; }
export function readPalette(storage: Pick<Storage, "getItem">): Palette { try { return paletteValue(storage.getItem(paletteKey)); } catch { return "gold"; } }
export function persistPalette(storage: Pick<Storage, "setItem">, value: Palette) { try { storage.setItem(paletteKey, value); } catch { /* Optional browser preference. */ } }
export const paletteScript = `(()=>{let p='gold';try{const v=localStorage.getItem('${paletteKey}');if(${JSON.stringify(Object.keys(palettes))}.includes(v))p=v}catch{}document.documentElement.dataset.palette=p})()`;
