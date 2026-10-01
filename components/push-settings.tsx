"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { activeDevice, currentId, deviceLabel, eligible, enable, inContext, permissionState, pushApi, registration, removeDevice, supported, type Device, type PublicConfig, type PushState, type PushProfile } from "@/lib/push/client";
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  const flight = useRef(false);
  const load = useCallback(async () => {
    const current = ++version.current;
    setMessage(""); setDevices([]); setLocalId(null); setConfig(null);
    setState(permissionState());
    if (!supported() || !eligible(profile)) return;
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      const id = sub ? await currentId(profile!, sub) : null;
      const result = await inContext(profile, async () => ({ config: await pushApi.config(), devices: await pushApi.list() }));
      if (current !== version.current) return;
      setConfig(result.config); setDevices(result.devices); setLocalId(id);
      if (Notification.permission === "granted") setState(sub && result.devices.some(row => row.id === id && activeDevice(row)) ? "subscribed" : "unsubscribed");
    } catch { if (current === version.current) { setState("error"); setMessage("Não foi possível consultar notificações. Atualize para tentar novamente."); } }
  }, [profile]);
  useEffect(() => {
    const requestVersion = version;
    const timer = setTimeout(() => void load(), 0);
    window.addEventListener("focus", load);
    return () => { clearTimeout(timer); requestVersion.current++; window.removeEventListener("focus", load); };
  }, [load]);
  async function action(work: () => Promise<unknown>) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setMessage("");
    const current = version.current;
    try { await work(); if (current === version.current) await load(); }
    catch { if (current === version.current) { setState("error"); setMessage("Não foi possível concluir. Confira a sessão, a empresa e a permissão; atualize e tente novamente."); } }
    finally { flight.current = false; setBusy(false); }
  }
  if (!profile) return null;
  const canManage = eligible(profile);
  const denied = typeof Notification !== "undefined" && Notification.permission === "denied";
  return <section className="commercial-panel push-settings" aria-labelledby="push-title">
    <h2 id="push-title">Notificações</h2>
    <p>{profile.selectedCompanyId ? "Preferências para a empresa selecionada." : "Preferências da conta administrativa."}</p>
    {!canManage ? <p>Selecione uma empresa para gerenciar notificações.</p> : <>
      {state === "unsupported" ? <p>Push indisponível neste navegador. Use um navegador compatível em HTTPS. No iOS, instale o aplicativo na Tela de Início.</p> : <>
        <p role="status">{state === "subscribed" ? "✓ Notificações ativadas neste dispositivo" : denied ? "Notificações bloqueadas" : "Notificações não ativadas neste dispositivo"}</p>
        <p>Dispositivo atual: {deviceLabel().label}</p>
        {denied && <p>Altere a permissão de notificações nas configurações deste site no navegador e volte ao Kalend.</p>}
        {config && !config.available && <p>O servidor ainda não disponibilizou Push.</p>}
        {state !== "subscribed" && <button type="button" disabled={busy || denied || !config?.available} onClick={() => void action(async () => { await enable(profile, config!); })}>Ativar notificações</button>}
        <button type="button" disabled={busy} onClick={() => void action(load)}>Atualizar estado</button>
        {devices.length > 0 && <><h3>Dispositivos registrados</h3><ul>{devices.map(row => <li key={row.id}>
          <p>{row.label || row.platform}{row.id === localId ? " · Este dispositivo" : ""} · {activeDevice(row) ? "Ativo" : "Inativo"}</p>
          {!row.revokedAt && <button type="button" disabled={busy || (!activeDevice(row) && denied)} onClick={() => void action(() => inContext(profile, () => pushApi.update(row.id, !activeDevice(row))))}>{activeDevice(row) ? "Desativar" : "Reativar"}{row.id === localId ? " neste dispositivo" : ""}{profile.selectedCompanyId ? " para esta empresa" : ""}</button>}
          <button type="button" disabled={busy} onClick={() => {
            if (!window.confirm("Remover este dispositivo revoga Push em todas as empresas. Continuar?")) return;
            void action(() => removeDevice(profile, row.id, localId));
          }}>Remover dispositivo em todas as empresas</button>
        </li>)}</ul></>}
        {!localId && state === "unsubscribed" && <p>Ativar reutiliza a subscription válida deste navegador e vincula o registro à sessão atual.</p>}
      </>}
    </>}
    {message && <p role="alert">{message}</p>}
  </section>;
}
