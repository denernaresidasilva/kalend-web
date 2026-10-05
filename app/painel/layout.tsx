"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, UserRound, Bell, Settings } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AdminShell } from "@/components/super-admin/admin-shell";
import { accountDestination } from "@/lib/company-selection";
import { accountRole } from "@/lib/account";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, error, reload, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const destination = profile ? accountDestination(profile) : "/";
  const authorized = !!profile && pathname === destination;
  useEffect(() => { if (!loading && !error && !authorized) router.replace(destination); }, [loading, error, authorized, destination, router]);
  async function leave() {
    setLeaving(true); setMessage("");
    try { await logout(); router.replace("/"); }
    catch { setMessage("Não foi possível sair. Tente novamente."); }
    finally { setLeaving(false); }
  }
  if (loading) return <main className="auth-state" role="status">Verificando sessão…</main>;
  if (error) return <main className="auth-state"><p role="alert">{error}</p><button onClick={() => void reload()}>Tentar novamente</button><Link href="/">Login</Link></main>;
  if (!profile || !authorized) return <main className="auth-state" role="status">Redirecionando…</main>;
  return <AdminShell profile={profile} logout={() => void leave()} leaving={leaving} error={message}
    navigationConfig={{ label: "Navegação do painel", brandHref: destination, brandLabel: "Kalend · Painel", groups: [{ label: "KALEND", items: [
      { label: "Painel", href: destination, icon: LayoutDashboard },
      { label: "Minha conta", href: "/conta", icon: UserRound },
      ...(profile.memberships.some(m => m.company.id === profile.selectedCompanyId && ["OWNER", "ADMIN"].includes(m.role)) ? [{ label: "Configurações", href: "/conta#preferencias", icon: Settings }] : []),
      { label: "Notificações", href: "/conta/notificacoes", icon: Bell },
    ] }] }} headerContext={{ title: `Painel · ${accountRole(profile)}`, settingsHref: "/conta#preferencias" }}>{children}</AdminShell>;
}
