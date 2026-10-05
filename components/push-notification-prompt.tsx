"use client";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { inContext, pushApi, registration, supported, type PublicConfig, type PushProfile } from "@/lib/push/client";
import { pushPromptAllowed } from "@/lib/push/routes";
import { activatePushPrompt, inspectPushPrompt, withPushPromptLock, type PromptStatus } from "@/lib/push/prompt";

export function PushNotificationPrompt() {
  const { profile, loading, error } = useAuth();
  const pathname = usePathname();
  const userId = profile?.user.id, companyId = profile?.selectedCompanyId, role = profile?.systemRole;
  const identity = useMemo(() => userId && role ? { user: { id: userId }, selectedCompanyId: companyId ?? null, systemRole: role } : null, [userId, companyId, role]);
  const allowed = !loading && !error && pushPromptAllowed(profile, pathname);
  const allowedRef = useRef(allowed);
  useEffect(() => { allowedRef.current = allowed; }, [allowed]);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<{ key: string; status: PromptStatus; attention: number } | null>(null);
  const [modal, setModal] = useState("");
  const [result, setResult] = useState("");
  const [resultKey, setResultKey] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const modalOpen = useRef(false);
  const release = useRef<(() => void) | null>(null);
  const dismissed = useRef("");
  const inspected = useRef<{ key: string; status: PromptStatus; permission: string } | null>(null);
  const activeKey = useRef("");
  const [attention, setAttention] = useState(0);
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const key = `${userId}:${companyId}:${pathname}:${revision}`;
  useEffect(() => { activeKey.current = key; }, [key]);
  useEffect(() => {
    const attentionChanged = () => { if (!busyRef.current && !modalOpen.current) setAttention(value => value + 1); };
    const open = () => {
      if (!allowedRef.current || inspected.current?.status === "ready" || modalOpen.current) return;
      const show = () => { modalOpen.current = true; setModal(activeKey.current); setResult(""); };
      if (release.current) { show(); return; }
      void withPushPromptLock(async () => {
        const closed = new Promise<void>(resolve => { release.current = resolve; });
        show(); await closed;
      }).catch(() => {});
    };
    window.addEventListener("kalend:push-open", open);
    const pushChanged = () => { if (!busyRef.current) changed(); };
    const changed = () => { modalOpen.current = false; inspected.current = null; dismissed.current = ""; release.current?.(); release.current = null; setRevision(value => value + 1); };
    window.addEventListener("focus", attentionChanged);
    window.addEventListener("blur", attentionChanged);
    document.addEventListener("visibilitychange", attentionChanged);
    for (const name of ["kalend:signed-in", "kalend:session-ended"]) window.addEventListener(name, changed);
    window.addEventListener("kalend:push-changed", pushChanged);
    return () => {
      release.current?.(); release.current = null;
      window.removeEventListener("kalend:push-open", open);
      window.removeEventListener("focus", attentionChanged); window.removeEventListener("blur", attentionChanged);
      document.removeEventListener("visibilitychange", attentionChanged);
      for (const name of ["kalend:signed-in", "kalend:session-ended"]) window.removeEventListener(name, changed);
      window.removeEventListener("kalend:push-changed", pushChanged);
    };
  }, []);
  useEffect(() => { dismissed.current = ""; inspected.current = null; modalOpen.current = false; release.current?.(); release.current = null; }, [identity, pathname]);
  useEffect(() => {
    let alive = true;
    let unlock: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!allowed || !identity || busyRef.current || document.visibilityState !== "visible" || !document.hasFocus() || dismissed.current === key) return;
      void withPushPromptLock(async () => {
        if (!alive) return;
        let status: PromptStatus;
        try {
          status = inspected.current?.key === key && inspected.current.permission === permission ? inspected.current.status : await inspectPushPrompt(identity);
          if (!alive) return;
          if (typeof Notification !== "undefined" && Notification.permission === "denied") status = "hidden";
          if (status === "invite" && Notification.permission !== "default") { inspected.current = null; status = await inspectPushPrompt(identity); }
          if (!alive) return;
        } catch {
          status = "error";
        }
        if (!alive) return;
        if (status === "error" && inspected.current?.key !== key) console.warn("KALEND_PUSH_PROMPT_CONFIGURATION_FAILED");
        inspected.current = { key, status, permission };
        if (status !== "invite" && status !== "error" && status !== "context" && status !== "paused") return;
        const closed = new Promise<void>(resolve => { unlock = resolve; release.current = resolve; });
        setView({ key, status, attention });
        await closed;
      }).catch(() => { if (alive) setView({ key, status: "error", attention }); });
    }, 0);
    return () => { alive = false; clearTimeout(timer); unlock?.(); if (release.current === unlock) release.current = null; };
  }, [identity, allowed, pathname, key, attention, permission]);
  const visible = allowed && !!identity && view?.key === key && view.attention === attention && permission !== "denied" && document.visibilityState === "visible" && document.hasFocus();
  function close(force = false) { if (busyRef.current && !force) return; modalOpen.current = false; setModal(""); setResult(""); dismissed.current = key; setView(null); release.current?.(); release.current = null; }
  async function activate(config?: PublicConfig) {
    if (!identity || busyRef.current) return;
    busyRef.current = true; setBusy(true); setResultKey(key);
    try {
      const status = await activatePushPrompt(identity, config);
      if (key === activeKey.current) { if (status === "ready") { close(true); setResult("success"); } else if (typeof Notification !== "undefined" && Notification.permission === "denied") { setResult("denied"); } else if (status === "hidden") close(true); else { setResult("error"); setView({ key, status, attention }); } }
    } catch { if (key === activeKey.current) { console.warn("KALEND_PUSH_PROMPT_ACTIVATION_FAILED"); inspected.current = { key, status: "error", permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission }; setResult("error"); setView({ key, status: "error", attention }); } }
    finally { busyRef.current = false; setBusy(false); }
  }
  if (!allowed || !identity) return null;
  if (modal === key || result && resultKey === key) return <PushActivationModal profile={identity} busy={busy} result={result || (permission === "denied" ? "denied" : "")} onClose={() => close()} onActivate={config => void activate(config)} />;
  if (!visible) return null;
  return <section className="kalend-ui k-push-prompt" role="dialog" aria-modal="false" aria-labelledby="push-prompt-title" aria-describedby="push-prompt-description" onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <h2 id="push-prompt-title">🔔 Ative as notificações</h2>
    <p id="push-prompt-description">Receba avisos importantes do Kalend mesmo quando não estiver com a página aberta.</p>
    <div><Button onClick={() => { modalOpen.current = true; setResult(""); setModal(activeKey.current); }}>Ativar notificações</Button><Button variant="ghost" onClick={() => close()}>Agora não</Button></div>
  </section>;
}

function PushActivationModal({ profile, busy, result, onClose, onActivate }: { profile: PushProfile; busy: boolean; result: string; onClose: () => void; onActivate: (config?: PublicConfig) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [prepared, setPrepared] = useState<{ config?: PublicConfig; failed?: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (!supported() || typeof Notification !== "undefined" && Notification.permission === "denied") throw new Error("Unavailable");
        await registration();
        const config = await inContext(profile, () => pushApi.config());
        if (!config.available || !config.publicKey) throw new Error("Unavailable");
        if (alive) setPrepared({ config });
      } catch { if (alive) setPrepared({ failed: true }); }
    })();
    return () => { alive = false; };
  }, [profile]);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const title = result === "success" ? "✓ Notificações ativadas com sucesso!" : result === "denied" ? "🔔 As notificações estão bloqueadas neste navegador." : "Permitir notificações do Kalend?";
  const text = result === "success" ? "Você receberá avisos importantes do Kalend neste dispositivo." : result === "denied" ? "Para ativá-las, permita notificações nas configurações do navegador." : result === "error" ? "Não foi possível ativar as notificações agora. Tente novamente mais tarde." : "Você receberá avisos de agendamentos, mensagens, pagamentos e outras informações importantes.";
  return <dialog ref={dialog} className="kalend-ui k-push-modal" aria-labelledby="push-modal-title" aria-describedby="push-modal-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="push-modal-title">{title}</h2><p id="push-modal-description" role="status">{text}</p>
    <div>{result === "success" || result === "denied" ? <Button onClick={onClose}>Entendi</Button> : <><Button loading={busy || !prepared && !result} disabled={!prepared || busy} onClick={() => onActivate(prepared?.config)}>Ativar agora</Button><Button variant="ghost" disabled={busy} onClick={onClose}>Agora não</Button></>}</div>
  </dialog>;
}
