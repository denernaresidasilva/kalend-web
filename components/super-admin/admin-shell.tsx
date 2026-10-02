"use client";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import { IconButton } from "@/components/ui/icon-button";
import { Drawer } from "@/components/ui/drawer";
import { Alert } from "@/components/ui/alert";
import { Sidebar, type SidebarConfig } from "./sidebar";
import { Header, type HeaderContext } from "./header";
export function AdminShell({ children, profile, logout, leaving, error, navigationConfig, headerContext }: { children: React.ReactNode; profile: AuthMe; logout: () => void; leaving: boolean; error: string; navigationConfig?: SidebarConfig; headerContext?: HeaderContext }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  return <div className={`kalend-ui k-admin-shell ${collapsed ? "k-admin-collapsed" : ""}`}><a href="#admin-main" className="k-skip">Ir para o conteúdo</a><aside className="k-admin-sidebar"><div><Sidebar config={navigationConfig} /><IconButton className="k-nav-collapse" aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"} aria-pressed={collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}</IconButton></div></aside><div className="k-admin-workspace"><Header profile={profile} context={headerContext} onMenu={() => setOpen(true)} menuOpen={open} logout={logout} leaving={leaving} /><div id="admin-main" tabIndex={-1} className="k-admin-main">{error && <Alert tone="danger">{error}</Alert>}{children}</div></div><Drawer id="admin-drawer" open={open} label={navigationConfig?.label ?? "Navegação do Super Admin"} onClose={() => setOpen(false)}><Sidebar config={navigationConfig} mobile onNavigate={() => setOpen(false)} /></Drawer></div>;
}
