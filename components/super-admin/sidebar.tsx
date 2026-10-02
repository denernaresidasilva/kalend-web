"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, activeDestination } from "./navigation";
import { Tooltip } from "@/components/ui/tooltip";
export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <><Link href="/super-admin" className="k-nav-brand" onClick={onNavigate} aria-label="Kalend · Dashboard"><span className="k-avatar" aria-hidden="true">K</span><span className={mobile ? "" : "k-desktop-expanded-label"}>Kalend</span></Link><nav aria-label="Navegação do Super Admin">{navigation.map(group => <section className="k-nav-group" key={group.label}><h2>{group.label}</h2>{group.items.map(item => {
    const Icon = item.icon;
    const link = <Link href={item.href} className="k-nav-link" aria-label={item.label} aria-current={activeDestination(pathname, item.href) ? "page" : undefined} onClick={onNavigate}><Icon size={20} aria-hidden="true" /><span className={mobile ? "" : "k-desktop-expanded-label"}>{item.label}</span></Link>;
    return mobile ? <div key={item.href}>{link}</div> : <Tooltip key={item.href} label={item.label}>{link}</Tooltip>;
  })}</section>)}</nav></>;
}
