import type { Summary } from "@/lib/contracts";
import { Card } from "@/components/ui/card";
export function StatusChart({ title, items }: { title: string; items: Array<[string, number]> }) {
  const maximum = Math.max(1, ...items.map(([, value]) => value));
  return <Card className="k-status-chart"><h2>{title}</h2><dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><span>{value.toLocaleString("pt-BR")}</span><span className="k-chart-track" aria-hidden="true"><span style={{ width: `${value / maximum * 100}%` }} /></span></dd></div>)}</dl>{items.every(([, value]) => value === 0) && <p className="k-muted">Nenhum registro neste grupo.</p>}</Card>;
}
export function DashboardCharts({ data }: { data: Summary }) {
  return <section className="k-dashboard-charts" aria-label="Distribuição por estado">
    <StatusChart title="Empresas por situação" items={[["Ativas", data.companies.active], ["Em trial", data.companies.trial], ["Suspensas", data.companies.suspended], ["Canceladas", data.companies.canceled]]} />
    <StatusChart title="Assinaturas por situação" items={[["Ativas", data.subscriptions.active], ["Em trial", data.subscriptions.trialing], ["Em atraso", data.subscriptions.pastDue], ["Canceladas", data.subscriptions.canceled], ["Expiradas", data.subscriptions.expired]]} />
    <StatusChart title="Pagamentos por situação" items={[["Aprovados", data.payments.approved], ["Pendentes", data.payments.pending], ["Falhos", data.payments.failed], ["Cancelados", data.payments.canceled], ["Estornos totais", data.payments.refunded]]} />
  </section>;
}
