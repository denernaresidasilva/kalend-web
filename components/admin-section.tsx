"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["Dashboard", "/super-admin"], ["Empresas", "/super-admin/empresas"], ["Planos", "/super-admin/planos"], ["Assinaturas", "/super-admin/assinaturas"], ["Financeiro", "/super-admin/financeiro"], ["Webhooks", "/super-admin/webhooks"], ["Usuários", "/super-admin/usuarios"], ["Pagamentos", "/super-admin/configuracoes/pagamentos"]];
export function AdminSection({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="companies-admin-page"><aside className="companies-sidebar"><div className="companies-brand"><div>K</div><span><strong>Kalend</strong><small>Super Admin</small></span></div><nav className="admin-nav">{links.map(([name, path]) => <Link key={path} href={path} className={`admin-nav-item ${pathname === path ? "active" : ""}`}>{name}</Link>)}</nav></aside><div className="companies-main">{children}</div></div>;
}
