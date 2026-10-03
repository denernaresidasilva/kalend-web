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
    const sessionEnd = () => { void navigator.serviceWorker?.getRegistration("/").then(async r => {
      if (!r) return;
      for (const notification of await r.getNotifications()) notification.close();
      const sub = await r.pushManager?.getSubscription();
      if (sub && !await sub.unsubscribe()) throw new Error("PUSH_LOCAL_CLEANUP_FAILED");
    }).catch(() => { if (alive) setError("A sessão foi encerrada e o servidor revogou Push. Não foi possível limpar a inscrição local; confira as permissões deste navegador."); }); };
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
