"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import { ThemeControl } from "@/components/theme/theme-control";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { pageContext } from "./navigation";
export function Header({ profile, onMenu, menuOpen, logout, leaving }: { profile: AuthMe; onMenu: () => void; menuOpen: boolean; logout: () => void; leaving: boolean }) {
  const pathname = usePathname();
  const { title, breadcrumbs } = pageContext(pathname);
  const action = pathname === "/super-admin" || pathname === "/super-admin/empresas"
    ? { href: "/super-admin/empresas/nova", label: "Nova empresa" }
    : pathname === "/super-admin/planos" ? { href: "/super-admin/planos/novo", label: "Novo plano" } : null;
  const initials = profile.user.name.trim().split(/\s+/).slice(0,2).map(name => name[0]).join("").toUpperCase();
  return <header className="k-admin-header"><div className="k-admin-context"><IconButton className="k-mobile-menu" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "admin-drawer" : undefined} onClick={event => { event.currentTarget.focus(); onMenu(); }}><Menu size={20} aria-hidden="true" /></IconButton><div><Breadcrumb items={breadcrumbs} /><strong>{title}</strong></div></div><div className="k-actions">{action && <Link className="k-link-button" href={action.href}>{action.label}</Link>}<ThemeControl /><details className="k-admin-user" onKeyDown={event => { if (event.key === "Escape") { const details = event.currentTarget; details.open = false; details.querySelector<HTMLElement>("summary")?.focus(); } }}><summary aria-label={`Menu de ${profile.user.name}`}><span className="k-avatar" aria-hidden="true">{initials}</span><span>{profile.user.name}</span></summary><div className="k-user-menu"><Link href="/conta">Minha conta / Notificações</Link><Link href="/super-admin/configuracoes/pagamentos">Pagamentos</Link><Button loading={leaving} variant="secondary" onClick={logout}>{leaving ? "Saindo…" : "Sair"}</Button></div></details></div></header>;
}
