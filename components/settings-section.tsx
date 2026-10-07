"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { EvolutionSettings } from "./evolution-settings";
import { GlobalEvolutionSending, ProviderEditor } from "./communication-providers";
import { EmailSettings } from "./email-settings";
import { PushSettings } from "./push-settings";
import { NotificationCenter } from "./notification-center";
import { AccountSecurity } from "./account-security";
import { ThemeControl } from "./theme/theme-control";
import { CommunicationOperations } from "./communication-operations";
import { CommunicationMeta } from "./communication-meta";
import { ResourceState, useCommunicationResource } from "./communication-resource";
import { api } from "@/lib/api";
import type { Gateway } from "@/lib/contracts";
import { gatewayNames } from "@/lib/commercial";
import { communication } from "@/lib/communication";
import { logoutAllSessions } from "@/lib/account-session";
import { settingsSections, type SettingsSection } from "@/lib/settings";
const loadGateways = (signal?: AbortSignal) => api<Gateway[]>("/payment-gateways", { signal });
function WebhookSettings() {
  const resource = useCommunicationResource(loadGateways);
  return <ResourceState {...resource} retry={() => void resource.load()}><div className="k-settings-grid">{resource.data?.map(row => <section className="commercial-panel" key={row.gateway}><h2>{gatewayNames[row.gateway]}</h2><p>{row.webhookConfigured ? "Credencial de webhook configurada" : "Credencial de webhook não configurada"}</p><Link href={`/super-admin/configuracoes/webhooks/${row.gateway}`}>Gerenciar configuração</Link></section>)}</div><Link href="/super-admin/webhooks">Consultar logs e histórico</Link></ResourceState>;
}
function IntegrationSettings() {
  const resource = useCommunicationResource(communication.providers);
  const [meta, setMeta] = useState(false);
  const gateways = useCommunicationResource(loadGateways);
  return <><ResourceState {...gateways} retry={() => void gateways.load()}><div className="k-settings-grid">{gateways.data?.map(row => <section className="commercial-panel" key={row.gateway}><h2>{gatewayNames[row.gateway]}</h2><p>{row.enabled ? "Integração habilitada" : "Integração desabilitada"} · {row.configured ? "Credencial configurada" : "Credencial não configurada"}</p><Link href={`/super-admin/configuracoes/pagamentos/${row.gateway}`}>Gerenciar configuração</Link></section>)}</div></ResourceState><ResourceState {...resource} retry={() => void resource.load()}>{meta ? <><ProviderEditor name="META" initial={resource.data?.find(row => row.provider === "META")} close={() => setMeta(false)} /><CommunicationMeta /></> : <section className="commercial-panel"><h2>Meta Cloud API</h2><p>{resource.data?.find(row => row.provider === "META")?.enabled ? "Integração habilitada" : "Integração desabilitada"}</p><button onClick={() => setMeta(true)}>Gerenciar configuração</button></section>}</ResourceState><div className="commercial-actions"><Link href="/super-admin/configuracoes/whatsapp">Gerenciar configuração de WhatsApp</Link><Link href="/super-admin/configuracoes/email">Gerenciar configuração de e-mail</Link><Link href="/super-admin/configuracoes/webhooks">Gerenciar configuração de webhooks</Link></div></>;
}
function PushProvider() {
  const resource = useCommunicationResource(communication.providers);
  return <ResourceState {...resource} retry={() => void resource.load()}><ProviderEditor name="PUSH_PENDING" initial={resource.data?.find(p => p.provider === "PUSH_PENDING")} close={() => void resource.load()} /></ResourceState>;
}
export function SettingsSectionPage({ section }: { section: SettingsSection }) {
  const { profile, logout } = useAuth();
  const router = useRouter();
  const flight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function leave(all: boolean) {
    if (flight.current) return;
    if (all && !window.confirm("Sair de todos os dispositivos?")) return;
    flight.current = true; setBusy(true); setError("");
    try { if (all) await logoutAllSessions(); await logout(); router.replace("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível encerrar a sessão."); }
    finally { flight.current = false; setBusy(false); }
  }
  if (!profile || profile.systemRole !== "SUPER_ADMIN") return null;
  return <CommunicationOperations><main className="commercial-page communication-page"><Link href="/super-admin/configuracoes">← Configurações</Link><h1>{settingsSections[section]}</h1><p>SUPER ADMIN · ESCOPO GLOBAL</p>
    {section === "whatsapp" && <><EvolutionSettings scope="GLOBAL" initiallyOpen /><GlobalEvolutionSending /></>}
    {section === "email" && <><EmailSettings scope="SYSTEM" /><p>Somente um provedor de e-mail pode ficar ativo. O sistema utiliza automaticamente o provedor habilitado. Gmail com OAuth: integração futura; Gmail por senha de app utiliza SMTP.</p></>}
    {section === "push" && <><PushSettings /><PushProvider /></>}
    {section === "notificacoes" && <NotificationCenter profile={profile} separatePush />}
    {section === "aparencia" && <section className="commercial-panel"><h2>Tema do sistema</h2><ThemeControl /></section>}
    {section === "integracoes" && <IntegrationSettings />}
    {section === "webhooks" && <WebhookSettings />}
    {section === "seguranca" && <AccountSecurity profile={profile} leaving={busy} onLogout={() => void leave(false)} onLogoutAll={() => void leave(true)} />}
    {error && <p role="alert">{error}</p>}
  </main></CommunicationOperations>;
}
