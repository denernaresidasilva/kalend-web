"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { activeDevice, currentId, eligible, inContext, permissionState, pushApi, registration, subscriptionMatchesVapid, supported, type PublicConfig, type PushState, type PushProfile } from "@/lib/push/client";
export function PushSettings() {
  const { profile: authProfile } = useAuth();
  const userId = authProfile?.user.id;
  const selectedCompanyId = authProfile?.selectedCompanyId;
  const systemRole = authProfile?.systemRole;
  // Identity/context stay stable across auth probes triggered by permission dialog focus.
  const profile = useMemo<PushProfile | null>(() => userId && systemRole ? {
    user: { id: userId }, selectedCompanyId: selectedCompanyId ?? null, systemRole,
  } : null, [userId, selectedCompanyId, systemRole]);
  const [state, setState] = useState<PushState>("unsupported");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const testRequest = useRef<string | null>(null);
  const testContext = useRef<string | null>(null);
  const version = useRef(0);
  const flight = useRef(false);
  const load = useCallback(async () => {
    const context = `${profile?.user.id}:${profile?.selectedCompanyId}`;
    if (testContext.current !== context) { testContext.current = context; testRequest.current = null; setTestMessage(""); }
    const current = ++version.current;
    setMessage(""); setConfig(null);
    setState(permissionState());
    if (!supported() || !eligible(profile)) return;
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      const id = sub ? await currentId(profile!, sub) : null;
      const result = await inContext(profile, async () => ({ config: await pushApi.config(), devices: await pushApi.list() }));
      if (current !== version.current) return;
      setConfig(result.config);
      if (Notification.permission === "granted") setState(sub && (!sub.expirationTime || sub.expirationTime > Date.now()) && result.config.available && subscriptionMatchesVapid(sub, result.config) && result.devices.some(row => row.id === id && activeDevice(row) && row.registeredInCurrentSession === true) ? "subscribed" : "unsubscribed");
    } catch { if (current === version.current) { setState("error"); setMessage("Não foi possível consultar notificações. Atualize para tentar novamente."); } }
  }, [profile]);
  useEffect(() => {
    const requestVersion = version;
    const timer = setTimeout(() => void load(), 0);
    window.addEventListener("focus", load);
    window.addEventListener("kalend:push-changed", load);
    return () => { clearTimeout(timer); requestVersion.current++; window.removeEventListener("focus", load); window.removeEventListener("kalend:push-changed", load); };
  }, [load]);
  async function sendTest() {
    if (flight.current || !profile) return;
    flight.current = true; setBusy(true); setTestMessage("");
    testRequest.current ??= crypto.randomUUID();
    const context = `${profile.user.id}:${profile.selectedCompanyId}`;
    try {
      const response = await inContext(profile, () => pushApi.test(testRequest.current!));
      if (!response.queued) throw new Error("Test unavailable");
      testRequest.current = null;
      if (context === testContext.current) setTestMessage("✓ Notificação enviada.");
    } catch { if (context === testContext.current) setTestMessage("Não foi possível enviar a notificação. Tente novamente."); }
    finally { flight.current = false; setBusy(false); }
  }
  if (!profile) return null;
  const denied = typeof Notification !== "undefined" && Notification.permission === "denied";
  return <section className="commercial-panel push-settings" aria-labelledby="push-title">
    <h2 id="push-title">Push Web</h2><p>Receba notificações do Kalend neste dispositivo.</p>
    <p role="status">{state === "subscribed" ? "🟢 Notificações ativadas" : "🔴 Notificações desativadas"}</p>
    {state === "subscribed" ? <><p>Você está recebendo notificações neste navegador.</p><button type="button" disabled={busy} onClick={() => void sendTest()}>{busy ? "Enviando…" : "Enviar notificação de teste"}</button></> : <>
      {denied && <p>🔔 As notificações estão bloqueadas neste navegador. Para ativá-las, permita notificações nas configurações do navegador.</p>}
      {state === "unsupported" && <p>As notificações não estão disponíveis neste navegador.</p>}
      {config && !config.available && <p>Não foi possível ativar as notificações agora. Tente novamente mais tarde.</p>}
      <button type="button" onClick={() => window.dispatchEvent(new Event("kalend:push-open"))}>Ativar notificações</button>
    </>}
    {message && <p role="alert">{message}</p>}{testMessage && <p role="status">{testMessage}</p>}
  </section>;
}
