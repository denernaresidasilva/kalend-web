"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./auth-provider";
import { EvolutionSettings } from "./evolution-settings";
import { EmailSettings } from "./email-settings";
import { PushSettings } from "./push-settings";
import { NotificationCenter } from "./notification-center";
import { AccountSecurity } from "./account-security";
import { ThemeControl } from "./theme/theme-control";
import { CommunicationOperations } from "./communication-operations";
import { logoutAllSessions } from "@/lib/account-session";
import { settingsSections, type SettingsSection } from "@/lib/settings";
export function AccountSettings({ section }: { section?: SettingsSection }) {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();
  const flight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function leave(all: boolean) {
    if (flight.current || all && !window.confirm("Sair de todos os dispositivos?")) return;
    flight.current = true; setBusy(true); setError("");
    try { if (all) await logoutAllSessions(); await logout(); router.replace("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível encerrar a sessão."); }
    finally { flight.current = false; setBusy(false); }
  }
  if (loading) return <main role="status">Verificando sessão…</main>;
  if (!profile) return <main><Link href="/">Entre para configurar sua conta</Link></main>;
  if (profile.systemRole === "SUPER_ADMIN") return <main><Link href={`/super-admin/configuracoes${section ? `/${section}` : ""}`}>Gerenciar configuração global</Link></main>;
  const membership = profile.memberships.find(m => m.company.id === profile.selectedCompanyId);
  const canConfigure = membership && ["OWNER", "ADMIN"].includes(membership.role);
  const root = "/conta/configuracoes";
  return <CommunicationOperations><main className="kalend-ui k-plans-container communication-page"><Link href={section ? root : "/conta"}>← {section ? "Configurações" : "Minha conta"}</Link><h1>{section ? settingsSections[section] : "Configurações"}</h1>
    {!section && <div className="k-settings-grid">{(["whatsapp", "email", "push", "notificacoes", "aparencia", "seguranca"] as const).filter(key => canConfigure || !["whatsapp", "email"].includes(key)).map(key => <section className="commercial-panel" key={key}><h2>{settingsSections[key]}</h2><Link href={`${root}/${key}`}>Gerenciar configuração</Link></section>)}</div>}
    {(section === "whatsapp" || section === "email") && (canConfigure ? <section key={profile.selectedCompanyId}><p>Configuração da empresa: {membership.company.name}</p>{section === "whatsapp" ? <EvolutionSettings scope="COMPANY" initiallyOpen /> : <EmailSettings scope="COMPANY" />}</section> : <p>Acesso não autorizado. Selecione uma empresa em que você seja proprietário ou administrador.</p>)}
    {section === "push" && <PushSettings />}
    {section === "notificacoes" && <NotificationCenter profile={profile} separatePush />}
    {section === "aparencia" && <ThemeControl />}
    {section === "seguranca" && <AccountSecurity profile={profile} leaving={busy} onLogout={() => void leave(false)} onLogoutAll={() => void leave(true)} />}
    {error && <p role="alert">{error}</p>}
  </main></CommunicationOperations>;
}
