"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, activeDestination } from "./navigation";
import { KalendLogo } from "@/components/kalend-logo";
import { Tooltip } from "@/components/ui/tooltip";
export type SidebarConfig = {
  groups: typeof navigation;
  label: string;
  brandHref: string;
  brandLabel: string;
  activeHref?: string;
};
export function Sidebar({ mobile = false, onNavigate, config }: { mobile?: boolean; onNavigate?: () => void; config?: SidebarConfig }) {
  const pathname = usePathname();
  const BrandLink = config?.brandHref.includes("#") ? "a" : Link;
  return <><BrandLink href={config?.brandHref ?? "/super-admin"} className="k-nav-brand" onClick={onNavigate} aria-label={config?.brandLabel ?? "Kalend · Visão geral"}><KalendLogo compact /><span className={mobile ? "k-logo-word" : "k-desktop-expanded-label k-logo-word"}>KALEND</span></BrandLink><nav aria-label={config?.label ?? "Navegação do Super Admin"}>{(config?.groups ?? navigation).map(group => <section className="k-nav-group" key={group.label}><h2>{group.label}</h2>{group.items.map(item => {
    const Icon = item.icon;
    const active = config?.activeHref !== undefined ? config.activeHref === item.href : activeDestination(pathname, item.href);
    const NavLink = item.href.includes("#") ? "a" : Link;
    const link = <NavLink href={item.href} className="k-nav-link" aria-label={item.label} aria-current={active ? "page" : undefined} onClick={onNavigate}><Icon size={20} aria-hidden="true" /><span className={mobile ? "" : "k-desktop-expanded-label"}>{item.label}</span></NavLink>;
    return mobile ? <div key={item.href}>{link}</div> : <Tooltip key={item.href} label={item.label}>{link}</Tooltip>;
  })}</section>)}</nav></>;
}
