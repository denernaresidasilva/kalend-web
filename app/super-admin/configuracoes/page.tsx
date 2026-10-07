import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { settingsSections } from "@/lib/settings";
export default function SettingsPage() {
  return <main><PageHeader title="Configurações" description="Central de configuração da plataforma Kalend." /><div className="k-settings-grid">{Object.entries(settingsSections).map(([key, label]) => <Card key={key}><h2>{label}</h2><Link href={`/super-admin/configuracoes/${key}`}>Gerenciar configuração</Link></Card>)}</div></main>;
}
