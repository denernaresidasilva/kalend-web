"use client";
import Link from "next/link";
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
  return <>
    <div className="session-bar"><Link href="/super-admin">Kalend</Link><Link href="/super-admin/configuracoes/pagamentos">Pagamentos</Link><details className="session-navigation"><summary>Navegação</summary><nav>{[["Empresas", "empresas"], ["Planos", "planos"], ["Assinaturas", "assinaturas"], ["Financeiro", "financeiro"], ["Usuários", "usuarios"], ["Webhooks", "webhooks"]].map(([label, path]) => <Link key={path} href={`/super-admin/${path}`}>{label}</Link>)}</nav></details><span>{profile.user.name}</span><button disabled={leaving} onClick={leave}>{leaving ? "Saindo…" : "Sair"}</button>{logoutError && <p role="alert">{logoutError}</p>}</div>
    {isSuperAdmin(profile) ? children : <main className="auth-state"><h1>Acesso não autorizado</h1><p>Sua conta não tem permissão para acessar o Super Admin.</p></main>}
  </>;
}
