import type { SubscriptionDetail } from "@/lib/contracts";
import { commercialStatuses, date, money, refundLabel } from "@/lib/commercial";
export function SubscriptionView({ data }: { data: SubscriptionDetail }) {
  return <><header className="commercial-heading"><div><p>ASSINATURA</p><h1>{data.company.name}</h1><p>{data.plan.name} · {commercialStatuses[data.status] ?? data.status}</p></div></header><section className="commercial-panel"><dl className="commercial-details">{[
    ["Intervalo", data.billingInterval === "YEARLY" ? "Anual" : "Mensal"], ["Gateway", data.gateway], ["Ambiente", data.environment ?? "Não informado"],
    ["Início", date(data.createdAt)], ["Início do trial", date(data.trialStartedAt)], ["Fim do trial", date(data.trialEndsAt)],
    ["Início do período", date(data.currentPeriodStart)], ["Fim do período", date(data.currentPeriodEnd)], ["Fim da graça", date(data.graceEndsAt)],
    ["Cancelamento solicitado em", date(data.cancellationRequestedAt)], ["Cancelada em", date(data.canceledAt)], ["Cancelar ao fim do período", data.cancelAtPeriodEnd ? "Sim" : "Não"],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>O status é informado pelo backend. As datas não alteram o estado apresentado.</p></section>
  <section className="commercial-panel"><h2>Pagamentos e estornos</h2>{!data.payments.length ? <p>Nenhum pagamento registrado.</p> : <div className="commercial-table-wrap"><table><thead><tr><th>Pagamento</th><th>Status</th><th>Valor original</th><th>Estornado</th><th>Estorno</th><th>Gateway / ambiente</th><th>Período</th></tr></thead><tbody>{data.payments.map(p => <tr key={p.id}><td>{p.id}</td><td>{commercialStatuses[p.status] ?? p.status}</td><td>{money(p.amountCents)}</td><td>{money(p.refundedAmountCents)}</td><td>{refundLabel(p.amountCents, p.refundedAmountCents)}</td><td>{p.gateway} / {p.environment ?? "Não informado"}</td><td>{date(p.periodStart)} — {date(p.periodEnd)}</td></tr>)}</tbody></table></div>}<p>Estorno parcial não equivale a cancelamento ou estorno total. O estado da assinatura permanece o informado pelo backend.</p></section></>;
}
