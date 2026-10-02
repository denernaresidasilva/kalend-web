"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, LogOut, Settings } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import { ThemeControl } from "@/components/theme/theme-control";
import { IconButton } from "@/components/ui/icon-button";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationBell } from "@/components/notification-bell";
import { pageContext } from "./navigation";
export type HeaderContext = { title: string; settingsHref: string };
export function Header({ profile, onMenu, menuOpen, logout, leaving, context }: { profile: AuthMe; onMenu: () => void; menuOpen: boolean; logout: () => void; leaving: boolean; context?: HeaderContext }) {
  const pathname = usePathname();
  const { title } = pageContext(pathname);
  const action = context ? null : pathname === "/super-admin" || pathname === "/super-admin/empresas"
    ? { href: "/super-admin/empresas/nova", label: "Nova empresa" }
    : pathname === "/super-admin/planos" ? { href: "/super-admin/planos/novo", label: "Novo plano" } : null;
  const SettingsLink = context?.settingsHref.includes("#") ? "a" : Link;
  const AvatarLink = context ? "a" : Link;
  return <header className="k-admin-header">
    <div className="k-admin-context"><IconButton className="k-mobile-menu" aria-label="Abrir menu" title="Abrir menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "admin-drawer" : undefined} onClick={event => { event.currentTarget.focus(); onMenu(); }}><Menu size={20} aria-hidden="true" /></IconButton><strong>{context?.title ?? (pathname === "/super-admin" ? "Visão geral" : title)}</strong></div>
    <div className="k-actions">
      {action && <Link className="k-link-button k-icon-button" href={action.href} aria-label={action.label} title={action.label}><Plus size={20} aria-hidden="true" /></Link>}
      <SettingsLink className="k-header-icon" href={context?.settingsHref ?? "/super-admin/configuracoes"} aria-label="Configurações" title="Configurações"><Settings size={20} aria-hidden="true" /></SettingsLink>
      <NotificationBell key={`${profile.user.id}:${profile.selectedCompanyId ?? "global"}`} profile={profile} />
      <ThemeControl />
      <AvatarLink className="k-header-icon" href={context ? "/conta#perfil" : "/conta"} aria-label="Minha conta" title="Minha conta"><UserAvatar name={profile.user.name} /></AvatarLink>
      <IconButton aria-label="Sair" title="Sair" loading={leaving} onClick={logout}><LogOut size={20} aria-hidden="true" /></IconButton>
    </div>
  </header>;
}
