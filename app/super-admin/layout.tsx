"use client";
import Link from "next/link";
import { AdminShell } from "@/components/super-admin/admin-shell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { isSuperAdmin } from "@/lib/contracts";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, error, reload, logout } = useAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => { if (!loading && !profile && !error) router.replace("/"); }, [loading, profile, error, router]);
  async function leave() {
    setLeaving(true); setLogoutError("");
    try { await logout(); router.replace("/"); }
    catch (err) { setLogoutError(err instanceof Error ? err.message : "Não foi possível sair. Tente novamente."); }
    finally { setLeaving(false); }
  }
  if (loading) return <main className="auth-state" role="status">Verificando sessão…</main>;
  if (error) return <main className="auth-state"><p role="alert">{error}</p><button onClick={() => void reload()}>Tentar novamente</button><Link href="/">Login</Link></main>;
  if (!profile) return <main className="auth-state" role="status">Redirecionando para login…</main>;
  return isSuperAdmin(profile) ? <AdminShell profile={profile} logout={() => void leave()} leaving={leaving} error={logoutError}>{children}</AdminShell> : <main className="auth-state"><h1>Acesso não autorizado</h1><p>Sua conta não tem permissão para acessar o Super Admin.</p><Link href="/conta">Ir para minha conta e assinatura</Link><button disabled={leaving} onClick={leave}>Sair</button>{logoutError && <p role="alert">{logoutError}</p>}</main>;
}
