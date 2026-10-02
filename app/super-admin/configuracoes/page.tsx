import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeControl } from "@/components/theme/theme-control";
export default function SettingsPage() {
  return <main><PageHeader title="Configurações" description="Acesse os controles disponíveis da plataforma." /><div className="k-settings-grid">
    <Card><h2>Conta</h2><p>Dados da sua conta autenticada e empresas vinculadas.</p><Link href="/conta">Abrir minha conta</Link></Card>
    <Card><h2>Empresa</h2><p>Consulte os estabelecimentos e cadastre novas empresas.</p><Link href="/super-admin/empresas">Gerenciar empresas</Link><Badge>Em preparação</Badge><p>Edição das configurações da empresa.</p></Card>
    <Card><h2>Aparência</h2><p>Escolha o tema das telas disponíveis.</p><ThemeControl /></Card>
    <Card><h2>Pagamentos</h2><p>Gateways, credenciais e testes de conexão.</p><Link href="/super-admin/configuracoes/pagamentos">Gerenciar pagamentos</Link></Card>
    <Card><h2>WhatsApp</h2><p>Consulte a configuração e valide a conexão no painel de canais.</p><Link href="/super-admin/comunicacao">Gerenciar WhatsApp</Link></Card>
    <Card><h2>E-mail</h2><p>Configuração dos provedores e testes de envio.</p><Link href="/super-admin/comunicacao">Gerenciar e-mail</Link></Card>
    <Card><h2>Push</h2><p>Permissão do navegador e dispositivos registrados da sua conta.</p><Link href="/conta">Gerenciar Push</Link></Card>
    <Card><h2>Notificações</h2><p>Templates, eventos, fila e registros de comunicação.</p><Link href="/super-admin/comunicacao">Gerenciar comunicação</Link></Card>
    <Card><h2>Integrações</h2><p>Integrações de pagamento e registros dos webhooks.</p><Link href="/super-admin/configuracoes/pagamentos">Consultar gateways</Link><Link href="/super-admin/webhooks">Consultar webhooks</Link></Card>
    <Card><h2>Segurança</h2><Badge>Em preparação</Badge><p>Novas opções de segurança estarão disponíveis em uma próxima etapa. Sua sessão atual continua em uso.</p></Card>
  </div></main>;
}
