"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { activatePushPrompt, inspectPushPrompt, withPushPromptLock, type PromptStatus } from "@/lib/push/prompt";

export function PushNotificationPrompt() {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const userId = profile?.user.id, companyId = profile?.selectedCompanyId, role = profile?.systemRole;
  const identity = useMemo(() => userId && role ? { user: { id: userId }, selectedCompanyId: companyId ?? null, systemRole: role } : null, [userId, companyId, role]);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<{ key: string; status: PromptStatus; attention: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const release = useRef<(() => void) | null>(null);
  const dismissed = useRef("");
  const inspected = useRef<{ key: string; status: PromptStatus; permission: string } | null>(null);
  const activeKey = useRef("");
  const [attention, setAttention] = useState(0);
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const key = `${userId}:${companyId}:${pathname}:${revision}`;
  useEffect(() => { activeKey.current = key; }, [key]);
  useEffect(() => {
    const attentionChanged = () => { if (!busyRef.current) setAttention(value => value + 1); };
    const changed = () => { inspected.current = null; dismissed.current = ""; release.current?.(); setRevision(value => value + 1); };
    window.addEventListener("focus", attentionChanged);
    window.addEventListener("blur", attentionChanged);
    document.addEventListener("visibilitychange", attentionChanged);
    for (const name of ["kalend:signed-in", "kalend:session-ended", "kalend:push-changed"]) window.addEventListener(name, changed);
    return () => {
      window.removeEventListener("focus", attentionChanged); window.removeEventListener("blur", attentionChanged);
      document.removeEventListener("visibilitychange", attentionChanged);
      for (const name of ["kalend:signed-in", "kalend:session-ended", "kalend:push-changed"]) window.removeEventListener(name, changed);
    };
  }, []);
  useEffect(() => { dismissed.current = ""; inspected.current = null; }, [identity, pathname]);
  useEffect(() => {
    let alive = true;
    let unlock: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!identity || loading || busyRef.current || document.visibilityState !== "visible" || !document.hasFocus() || dismissed.current === key) return;
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
  }, [identity, loading, pathname, key, attention, permission]);
  const visible = !!identity && !loading && view?.key === key && view.attention === attention && permission !== "denied" && document.visibilityState === "visible" && document.hasFocus();
  function close() { dismissed.current = key; setView(null); release.current?.(); }
  async function activate() {
    if (!identity || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const status = await activatePushPrompt(identity);
      if (key === activeKey.current) { if (status === "ready" || status === "hidden") close(); else setView({ key, status, attention }); }
    } catch { if (key === activeKey.current) { console.warn("KALEND_PUSH_PROMPT_ACTIVATION_FAILED"); inspected.current = { key, status: "error", permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission }; setView({ key, status: "error", attention }); } }
    finally { busyRef.current = false; setBusy(false); setAttention(value => value + 1); }
  }
  if (!visible) return null;
  return <section className="kalend-ui k-push-prompt" role="dialog" aria-modal="false" aria-labelledby="push-prompt-title" aria-describedby="push-prompt-description" onKeyDown={event => { if (event.key === "Escape" && !busy) close(); }}>
    <h2 id="push-prompt-title"><Bell size={22} aria-hidden="true" /> {view.status === "invite" ? "Ative as notificações do Kalend" : "Configure suas notificações"}</h2>
    <p id="push-prompt-description" role={view.status === "error" ? "status" : undefined}>{view.status === "invite" ? "Receba avisos importantes do Kalend mesmo quando você não estiver com o painel aberto." : view.status === "context" ? "Selecione uma empresa para vincular as notificações com segurança." : view.status === "paused" ? "As notificações estão pausadas para esta empresa. Gerencie sua preferência nas configurações." : "Não foi possível concluir a configuração do Push Web. Confira a sessão, a empresa e a configuração nas preferências de notificações."}</p>
    <div>{view.status === "invite" && <Button loading={busy} onClick={() => void activate()}>Ativar notificações</Button>}<Link className="k-button k-button-secondary" href="/conta/notificacoes#preferencias" onClick={close}>Configurações</Link><Button variant="ghost" disabled={busy} onClick={close}>Agora não</Button></div>
  </section>;
}
