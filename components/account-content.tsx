"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound, ShieldCheck, SlidersHorizontal, LayoutDashboard, Bell } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import type { useAuth } from "@/components/auth-provider";
import { PushSettings } from "@/components/push-settings";
import { RegularizationPanel } from "@/components/regularization-panel";
import { CompanySelector } from "@/components/company-selector";
import { linkedCompanies, selectCompany } from "@/lib/company-selection";
import { accountMembership, accountSection } from "@/lib/account";
import { logoutAllSessions } from "@/lib/account-session";
import { AdminShell } from "@/components/super-admin/admin-shell";
import { NotificationCenter } from "@/components/notification-center";
import { AccountProfile } from "@/components/account-profile";
import { AccountSecurity } from "@/components/account-security";
import { ThemeControl } from "@/components/theme/theme-control";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Drawer } from "@/components/ui/drawer";

const sections = [
  { label: "Perfil", href: "/conta#perfil", icon: UserRound },
  { label: "Segurança", href: "/conta#seguranca", icon: ShieldCheck },
  { label: "Preferências", href: "/conta#preferencias", icon: SlidersHorizontal },
];
function subscribeSection(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => { window.removeEventListener("hashchange", listener); window.removeEventListener("popstate", listener); };
}
export function AccountContent({ profile, reload, logout, notifications = false }: { profile: AuthMe; notifications?: boolean } & Pick<ReturnType<typeof useAuth>, "reload" | "logout">) {
  const router = useRouter();
  const section = useSyncExternalStore(subscribeSection, () => accountSection(window.location.hash), () => "perfil" as const);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const flight = useRef(false);
  const version = useRef(0);
  useEffect(() => { const generation = version; generation.current++; return () => { generation.current++; }; }, []);
  async function select(companyId: string) {
    if (flight.current || !profile) return;
    flight.current = true; setBusy(true); setMessage("");
    const current = version.current;
    try { await selectCompany(profile, companyId); await reload(false); }
    catch (err) { if (version.current === current) setMessage(err instanceof Error ? err.message : "Não foi possível selecionar a empresa."); }
    finally { flight.current = false; if (version.current === current) setBusy(false); }
  }
  async function leave(all = false) {
    if (flight.current) return;
    flight.current = true; setLeaving(true); setMessage("");
    const current = version.current;
    try { if (all) await logoutAllSessions(); else await logout(); router.replace("/"); }
    catch (err) { if (version.current === current) setMessage(err instanceof Error ? err.message : "Não foi possível encerrar a sessão. Tente novamente."); }
    finally { flight.current = false; if (version.current === current) setLeaving(false); }
  }
  const companies = linkedCompanies(profile);
  const membership = accountMembership(profile);
  const admin = profile.systemRole === "SUPER_ADMIN";
  const accountItems = [...sections, { label: "Notificações", href: "/conta/notificacoes", icon: Bell }];
  const navItems = admin ? [...accountItems, { label: "Super Admin", href: "/super-admin", icon: LayoutDashboard }] : accountItems;
  return <AdminShell profile={profile} logout={() => void leave()} leaving={leaving || busy} error={message}
    navigationConfig={{ groups: [{ label: "MINHA CONTA", items: navItems }], label: "Navegação de Minha conta", brandHref: "/conta#perfil", brandLabel: "Kalend · Minha conta", activeHref: notifications ? "/conta/notificacoes" : `/conta#${section}` }}
    headerContext={{ title: notifications ? "Notificações" : "Minha conta", settingsHref: notifications ? "/conta/notificacoes#preferencias" : "/conta#preferencias" }}>
    <main className="k-account-page">
      <div className="k-account-heading"><span className="k-eyebrow">MINHA CONTA</span><h1 aria-live="polite">{notifications ? "Notificações" : sections.find(item => item.href === `/conta#${section}`)?.label}</h1></div>
      {notifications && <NotificationCenter key={`${profile.user.id}:${profile.selectedCompanyId ?? "global"}`} profile={profile} />}
      {!notifications && section === "perfil" && <div className="k-account-stack"><AccountProfile profile={profile} />
        <Card aria-labelledby="account-company-title"><h2 id="account-company-title">Contexto da empresa</h2>
          {admin && <p>Sua conta tem acesso global ao Super Admin e não exige uma empresa selecionada.</p>}
          {companies.length === 0 ? <p>Nenhuma empresa vinculada à sua conta.</p> : <>
            <p>{membership ? `Empresa selecionada: ${membership.company.name}` : "Nenhuma empresa selecionada."}</p>
            {(companies.length > 1 || !membership) && <><p className="k-muted">Use a seleção de empresa abaixo para trocar o contexto da sessão. Os dados pessoais não alteram esse contexto.</p><CompanySelector key={`${profile.user.id}:${profile.selectedCompanyId ?? "none"}`} profile={profile} busy={busy || leaving} select={select} allowSingle /></>}
          </>}
        </Card>
        {!busy && membership && !admin && (["OWNER", "ADMIN"].includes(membership.role)
          ? <section aria-label="Assinatura da empresa"><Link href="/conta/planos" className="k-link-button">Escolher plano</Link><RegularizationPanel key={`${profile.user.id}:${membership.company.id}`} companyId={membership.company.id} /></section>
          : <Card><h2>Assinatura da empresa</h2><p>Solicite ao proprietário ou administrador a gestão da assinatura.</p></Card>)}
      </div>}
      {!notifications && section === "seguranca" && <AccountSecurity profile={profile} leaving={leaving || busy} onLogout={() => void leave()} onLogoutAll={() => setConfirmLogout(true)} />}
      {!notifications && section === "preferencias" && <div className="k-account-stack"><Card><h2>Aparência</h2><p>Alterne entre os modos claro e escuro. A preferência fica salva neste navegador.</p><ThemeControl /></Card>
        {!busy && (membership || admin) ? <PushSettings key={`${profile.user.id}:${profile.selectedCompanyId ?? "admin"}`} /> : <Card><h2>Notificações do navegador</h2><p>Selecione uma empresa no Perfil para gerenciar as preferências existentes.</p><a href="/conta#perfil">Abrir perfil</a></Card>}
      </div>}
    </main>
    <Drawer open={confirmLogout} label="Sair de todos os dispositivos" onClose={() => { if (!leaving) setConfirmLogout(false); }}>
      <p>Isso encerra todas as sessões da sua conta, incluindo este dispositivo. Você precisará entrar novamente.</p>
      <div className="k-actions"><Button variant="secondary" disabled={leaving} onClick={() => setConfirmLogout(false)}>Cancelar</Button><Button loading={leaving} onClick={() => void leave(true)}>Confirmar e sair</Button></div>
      {message && <Alert tone="danger">{message}</Alert>}
    </Drawer>
  </AdminShell>;
}
