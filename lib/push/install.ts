export interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function watchInstall(change: (event: InstallEvent | null, ios: boolean) => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  let pending: InstallEvent | null = null;
  let installed = media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const emit = () => change(installed ? null : pending, !installed && ios);
  const before = (event: Event) => { event.preventDefault(); pending = event as InstallEvent; emit(); };
  const done = () => { installed = true; pending = null; emit(); };
  const mode = () => { installed = media.matches; emit(); };
  window.addEventListener("beforeinstallprompt", before);
  window.addEventListener("appinstalled", done);
  media.addEventListener("change", mode); emit();
  return () => { window.removeEventListener("beforeinstallprompt", before); window.removeEventListener("appinstalled", done); media.removeEventListener("change", mode); };
}
