"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { evaluatePush, type PushStatus, type PushProfile } from "@/lib/push/client";
import { watchPushChanges } from "@/lib/push/events";
const labels: Record<PushStatus, string> = {
  loading: "Verificando notificações...",
  activated: "🟢 Notificações ativadas",
  paused: "Notificações pausadas",
  blocked: "Notificações bloqueadas no navegador",
  unavailable: "Notificações indisponíveis",
  context: "Selecione uma empresa para gerenciar notificações",
  error: "Não foi possível verificar notificações. Tente novamente.",
  needs_registration: "Notificações ainda não ativadas",
};
export function PushSettings() {
  const { profile: authProfile } = useAuth();
  const userId = authProfile?.user.id;
  const selectedCompanyId = authProfile?.selectedCompanyId;
  const systemRole = authProfile?.systemRole;
  const profile = useMemo<PushProfile | null>(() => userId && systemRole ? {
    user: { id: userId }, selectedCompanyId: selectedCompanyId ?? null, systemRole,
  } : null, [userId, selectedCompanyId, systemRole]);
  const [state, setState] = useState<{ context: string; status: PushStatus }>({ context: "", status: "loading" });
  const version = useRef(0);
  const context = `${userId}:${selectedCompanyId}`;
  const status = state.context === context ? state.status : "loading";
  const load = useCallback(async () => {
    const current = ++version.current;
    const context = `${profile?.user.id}:${profile?.selectedCompanyId}`;
    setState({ context, status: "loading" });
    const result = await evaluatePush(profile);
    if (current === version.current) setState({ context, status: result.status });
  }, [profile]);
  useEffect(() => {
    const requestVersion = version;
    watchPushChanges();
    const timer = setTimeout(() => void load(), 0);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", load);
    window.addEventListener("kalend:push-changed", load);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer); requestVersion.current++;
      window.removeEventListener("focus", load);
      window.removeEventListener("kalend:push-changed", load);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  if (!profile) return null;
  return <section className="commercial-panel push-settings" aria-labelledby="push-title">
    <h2 id="push-title">Push Web</h2><p>Receba notificações do Kalend neste dispositivo.</p>
    <p role={status === "error" ? "alert" : "status"}>{labels[status]}</p>
    {status === "activated" && <p>Este navegador está configurado para receber notificações.</p>}
    {status === "blocked" && <p>Permita notificações nas configurações do navegador para continuar.</p>}
    {(status === "needs_registration" || status === "paused") && <button type="button" onClick={() => window.dispatchEvent(new Event("kalend:push-open"))}>{status === "paused" ? "Reativar notificações" : "Ativar notificações"}</button>}
    {(status === "error" || status === "unavailable") && <button type="button" onClick={() => void load()}>Verificar novamente</button>}
  </section>;
}
