import { gatewayNames } from "@/lib/commercial";
import { Building2, LayoutDashboard, Users, CreditCard, WalletCards, CircleDollarSign, MessageSquare, Webhook, Settings } from "lucide-react";
export const navigation = [
  { label: "SISTEMA", items: [{ label: "Dashboard", href: "/super-admin", icon: LayoutDashboard }, { label: "Empresas", href: "/super-admin/empresas", icon: Building2 }, { label: "Usuários", href: "/super-admin/usuarios", icon: Users }] },
  { label: "NEGÓCIO", items: [{ label: "Planos", href: "/super-admin/planos", icon: CreditCard }, { label: "Assinaturas", href: "/super-admin/assinaturas", icon: WalletCards }, { label: "Financeiro", href: "/super-admin/financeiro", icon: CircleDollarSign }] },
  { label: "COMUNICAÇÃO", items: [{ label: "Comunicação", href: "/super-admin/comunicacao", icon: MessageSquare }, { label: "Webhooks", href: "/super-admin/webhooks", icon: Webhook }] },
  { label: "CONFIGURAÇÕES", items: [{ label: "Configurações", href: "/super-admin/configuracoes", icon: Settings }] },
];
export function activeDestination(pathname: string, href: string) {
  return pathname === href || (href !== "/super-admin" && pathname.startsWith(`${href}/`));
}
export function pageContext(pathname: string) {
  const item = navigation.flatMap(group => group.items).find(item => activeDestination(pathname, item.href));
  const title = item?.label ?? "Super Admin";
  const parts: Array<{ label: string; href?: string }> = [{ label: "Super Admin", href: "/super-admin" }, { label: title }];
  if (pathname.includes("/pagamentos")) { parts[1] = { label: "Configurações", href: "/super-admin/configuracoes" }; parts.push({ label: "Pagamentos" });
    if (pathname !== "/super-admin/configuracoes/pagamentos") {
      parts[2] = { label: "Pagamentos", href: "/super-admin/configuracoes/pagamentos" };
      const gateway = pathname.split("/").at(-1) as keyof typeof gatewayNames;
      parts.push({ label: gatewayNames[gateway] ?? "Provedor" });
    } }
  else if (pathname.endsWith("/novo") || pathname.endsWith("/nova")) parts.push({ label: "Novo cadastro" });
  else if (item && pathname !== item.href) parts.push({ label: "Detalhes" });
  return { title, breadcrumbs: parts };
}
