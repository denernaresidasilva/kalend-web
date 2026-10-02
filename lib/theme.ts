export type ThemePreference = "light" | "dark" | "system";
export const themeKey = "kalend:theme";
export function themePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolvedTheme(preference: ThemePreference, systemDark: boolean) {
  return preference === "system" ? systemDark ? "dark" : "light" : preference;
}
export function readTheme(storage: Pick<Storage, "getItem">): ThemePreference {
  try { return themePreference(storage.getItem(themeKey)); } catch { return "system"; }
}
export function persistTheme(storage: Pick<Storage, "setItem">, preference: ThemePreference) {
  try { storage.setItem(themeKey, preference); } catch { /* Visual preference is optional. */ }
}

// Fixed script, containing no user or session data. Runs before the themed content paints.
export const themeScript = `(()=>{let p='system';try{const v=localStorage.getItem('${themeKey}');if(v==='light'||v==='dark')p=v}catch{}const m=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=p==='system'?(m.matches?'dark':'light'):p;document.documentElement.dataset.themePreference=p};apply();m.addEventListener('change',apply);addEventListener('storage',e=>{if(e.key==='${themeKey}'){p=e.newValue==='light'||e.newValue==='dark'?e.newValue:'system';apply()}});addEventListener('kalend:theme',()=>{p=document.documentElement.dataset.themePreference||'system';apply()})})()`;
