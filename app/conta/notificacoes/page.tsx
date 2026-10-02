"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { AccountContent } from "@/components/account-content";
import { Loading } from "@/components/ui/loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { profile, loading, error, reload, logout } = useAuth();
  if (loading) return <main className="kalend-ui k-plans-container"><Loading>Verificando sessão…</Loading></main>;
  if (error) return <main className="kalend-ui k-plans-container"><Alert tone="danger">{error}</Alert><Button onClick={() => void reload()}>Tentar novamente</Button><Link href="/">Ir para login</Link></main>;
  if (!profile) return <main className="kalend-ui k-plans-container"><h1>Entre para continuar</h1><p>Sua sessão não está ativa. Entre novamente para acessar Minha conta.</p><Link className="k-link-button" href="/">Ir para login</Link></main>;
  return <AccountContent notifications key={profile.user.id} profile={profile} reload={reload} logout={logout} />;
}
