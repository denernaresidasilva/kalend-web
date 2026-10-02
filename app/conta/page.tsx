"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { PushSettings } from "@/components/push-settings";
import { RegularizationPanel } from "@/components/regularization-panel";
import { CompanySelector } from "@/components/company-selector";
import { linkedCompanies, selectCompany } from "@/lib/company-selection";
export default function AccountPage() {
  const { profile, loading, error, reload, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function select(companyId: string) {
    setBusy(true); setMessage("");
    try { if (!profile) return; await selectCompany(profile, companyId); await reload(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível selecionar a empresa."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!profile) return;
    const companies = linkedCompanies(profile);
    if (companies.length !== 1 || profile.selectedCompanyId === companies[0].company.id) return;
    let alive = true;
    const timer = setTimeout(() => {
      setBusy(true); setMessage("");
      void selectCompany(profile, companies[0].company.id).then(() => reload()).catch(() => {
        if (alive) setMessage("Não foi possível selecionar sua empresa. Atualize para tentar novamente.");
      }).finally(() => { setBusy(false); });
    }, 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [profile, reload]);
  if (loading) return <main className="auth-state" role="status">Verificando sessão…</main>;
  if (error) return <main className="auth-state"><p role="alert">{error}</p><button onClick={() => void reload()}>Tentar novamente</button></main>;
  if (!profile) return <main className="auth-state"><h1>Entre para continuar</h1><Link href="/">Ir para login</Link></main>;
  const companies = linkedCompanies(profile);
  const needsCompany = companies.length === 1 && profile.selectedCompanyId !== companies[0].company.id;
  const membership = companies.find(m => m.company.id === profile.selectedCompanyId);
  return <main className="commercial-page account-page"><header className="commercial-heading"><div><p>MINHA CONTA</p><h1>{profile.user.name}</h1><p>{profile.user.email}</p></div><button disabled={busy} onClick={async () => { setBusy(true); try { await logout(); } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); } }}>Sair</button></header>
    {profile.systemRole === "SUPER_ADMIN" && <Link href="/super-admin">Abrir Super Admin</Link>}
    {companies.length === 0 ? <section className="commercial-panel"><p>Nenhuma empresa vinculada à sua conta.</p></section> : companies.length > 1 ? <CompanySelector profile={profile} busy={busy} select={select} /> : <section className="commercial-panel"><p>{needsCompany ? "Preparando o acesso à sua empresa…" : `Empresa: ${companies[0].company.name}`}</p>{needsCompany && message && <button type="button" disabled={busy} onClick={() => void select(companies[0].company.id)}>Tentar novamente</button>}</section>}
    {!busy && !needsCompany && (membership || profile.systemRole === "SUPER_ADMIN") && <PushSettings key={`${profile.user.id}:${profile.selectedCompanyId ?? "admin"}`} />}
    {message && <p role="alert">{message}</p>}
    {!busy && membership && profile.systemRole !== "SUPER_ADMIN" && <>{["OWNER", "ADMIN"].includes(membership.role) ? <><Link href="/conta/planos">Escolher plano</Link><RegularizationPanel key={membership.company.id} companyId={membership.company.id} /></> : <section className="commercial-panel"><h2>Assinatura da empresa</h2><p>Solicite ao proprietário ou administrador a gestão da assinatura. Sua conta continua autenticada.</p></section>}</>}
  </main>;
}
