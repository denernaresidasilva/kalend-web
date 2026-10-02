"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
const seen = new Set<string>();
export function TrialNotice({ preferenceKey, message }: { preferenceKey: string; message: string }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const router = useRouter();
  useEffect(() => {
    const storageKey = `kalend:trial:${preferenceKey}`;
    let dismissed = seen.has(storageKey);
    try { dismissed ||= sessionStorage.getItem(storageKey) === "seen"; } catch { /* In-memory preference covers restricted storage. */ }
    if (dismissed) return;
    const timer = setTimeout(() => {
      seen.add(storageKey);
      try { sessionStorage.setItem(storageKey, "seen"); } catch { /* No backend persistence. */ }
      setOpen(true);
    }, 0);
    return () => { clearTimeout(timer); };
  }, [preferenceKey]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement === document.body ? document.querySelector<HTMLElement>("main button, main a") : document.activeElement;
    panel.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [open]);
  if (!open) return null;
  return <section ref={panel} className="kalend-ui k-trial-notice" role="dialog" aria-modal="false" tabIndex={-1} aria-label="Aviso do período de teste" aria-describedby="trial-notice-description" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
    <button type="button" aria-label="Fechar aviso do período de teste" onClick={() => setOpen(false)}>×</button>
    <p id="trial-notice-description">{message}</p>
    <div><button type="button" onClick={() => { setOpen(false); router.push("/planos"); }}>Escolher plano</button><button type="button" onClick={() => setOpen(false)}>Continuar usando</button></div>
  </section>;
}
