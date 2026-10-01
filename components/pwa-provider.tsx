"use client";
import { useEffect, useState } from "react";
import { watchInstall, type InstallEvent } from "@/lib/push/install";
export function PwaProvider() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const unwatch = watchInstall((event, hint) => { setInstall(event); setIos(hint); });
    let alive = true;
    let reg: ServiceWorkerRegistration | undefined;
    let worker: ServiceWorker | null = null;
    const inspect = () => { if (alive && reg?.waiting) setWaiting(reg.waiting); };
    const state = () => { if (worker?.state === "installed") inspect(); };
    const update = () => { worker?.removeEventListener("statechange", state); worker = reg?.installing ?? null; worker?.addEventListener("statechange", state); };
    const check = () => { if (reg) void reg.update().catch(() => {}); };
    const sessionEnd = () => { void navigator.serviceWorker?.ready.then(r => r.pushManager?.getSubscription()).then(sub => sub?.unsubscribe()).catch(() => {}); };
    if (window.isSecureContext && navigator.serviceWorker) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(value => {
        if (!alive) return;
        reg = value; inspect(); update(); reg.addEventListener("updatefound", update);
      }).catch(() => { if (alive) setError("Não foi possível preparar o aplicativo. Recarregue para tentar novamente."); });
    }
    window.addEventListener("focus", check);
    window.addEventListener("kalend:session-ended", sessionEnd);
    return () => { alive = false; unwatch(); reg?.removeEventListener("updatefound", update); worker?.removeEventListener("statechange", state); window.removeEventListener("focus", check); window.removeEventListener("kalend:session-ended", sessionEnd); };
  }, []);
  async function installApp() {
    if (!install) return;
    const event = install; setInstall(null);
    try { await event.prompt(); await event.userChoice; } catch { setError("Não foi possível instalar. Tente pelo menu do navegador."); }
  }
  function updateApp() {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting?.postMessage({ type: "KALEND_UPDATE" });
  }
  if (!install && !ios && !waiting && !error) return null;
  return <aside className="pwa-banner" aria-label="Aplicativo Kalend">
    {install && <button type="button" onClick={() => void installApp()}>Instalar Kalend</button>}
    {ios && <p>Para instalar o Kalend, use Compartilhar → Adicionar à Tela de Início no navegador compatível.</p>}
    {waiting && <><p>Há uma atualização do Kalend. Salve seu trabalho antes de atualizar.</p><button type="button" onClick={updateApp}>Atualizar aplicativo</button></>}
    {error && <p role="status">{error}</p>}
  </aside>;
}
