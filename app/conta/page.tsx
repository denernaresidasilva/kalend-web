"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { RegularizationPanel } from "@/components/regularization-panel";
import { api, jsonBody, tenantChanged, withTenantLock } from "@/lib/api";
export default function AccountPage() {
  const { profile, loading, error, reload, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function select(companyId: string) {
    setBusy(true); setMessage("");
    try { await withTenantLock(() => api("/auth/tenant", { method: "POST", ...jsonBody({ companyId: companyId || null }) })); tenantChanged(); await reload(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível selecionar a empresa."); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="auth-state" role="status">Verificando sessão…</main>;
  if (error) return <main className="auth-state"><p role="alert">{error}</p><button onClick={() => void reload()}>Tentar novamente</button></main>;
  if (!profile) return <main className="auth-state"><h1>Entre para continuar</h1><Link href="/">Ir para login</Link></main>;
  const membership = profile.memberships.find(m => m.company.id === profile.selectedCompanyId);
  return <main className="commercial-page account-page"><header className="commercial-heading"><div><p>MINHA CONTA</p><h1>{profile.user.name}</h1><p>{profile.user.email}</p></div><button disabled={busy} onClick={async () => { setBusy(true); try { await logout(); } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); } }}>Sair</button></header>
    {profile.systemRole === "SUPER_ADMIN" && <Link href="/super-admin">Abrir Super Admin</Link>}
    <section className="commercial-panel commercial-form"><label>Empresa<select disabled={busy} value={profile.selectedCompanyId ?? ""} onChange={e => void select(e.target.value)}><option value="">Selecione uma empresa</option>{profile.memberships.map(m => <option key={m.id} value={m.company.id}>{m.company.name} · {m.role}</option>)}</select></label>{!profile.memberships.length && <p>Nenhuma empresa vinculada à sua conta.</p>}</section>
    {message && <p role="alert">{message}</p>}
    {!busy && membership && (["OWNER", "ADMIN"].includes(membership.role) ? <RegularizationPanel key={membership.company.id} companyId={membership.company.id} /> : <section className="commercial-panel"><h2>Assinatura da empresa</h2><p>Solicite ao proprietário ou administrador a gestão da assinatura. Sua conta continua autenticada.</p></section>)}
  </main>;
}
