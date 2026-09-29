"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Summary } from "@/lib/contracts";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export default function DashboardSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api<Summary>("/dashboard/summary")); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const refresh = () => { void load(); }; const timer = setTimeout(refresh, 0); window.addEventListener("focus", refresh); return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); }; }, [load]);
  const groups: Array<{ name: string; items: Array<[string, string | number]> }> = data ? [
    { name: "Empresas", items: [["Total", data.companies.total], ["Ativas", data.companies.active], ["Em trial", data.companies.trial], ["Novas no mês UTC", data.companies.new], ["Suspensas", data.companies.suspended], ["Canceladas", data.companies.canceled], ["Inativas", data.companies.inactive], ["Usuários", data.users.total]] },
    { name: "Assinaturas", items: [["Total", data.subscriptions.total], ["Ativas", data.subscriptions.active], ["Em trial", data.subscriptions.trialing], ["Em atraso", data.subscriptions.pastDue], ["Canceladas", data.subscriptions.canceled], ["Expiradas", data.subscriptions.expired]] },
    { name: "Financeiro", items: [["Receita após estornos", money(data.payments.revenueCents)], ["Receita do mês UTC após estornos", money(data.payments.monthlyRevenueCents)], ["Pagamentos", data.payments.total], ["Aprovados", data.payments.approved], ["Pendentes", data.payments.pending], ["Falhos", data.payments.failed], ["Cancelados", data.payments.canceled], ["Estornos totais", data.payments.refunded]] },
  ] : [];
  return <><button className="new-company-submit" onClick={() => void load()} disabled={loading}>{error ? "Tentar novamente" : "Atualizar métricas"}</button>
    {loading ? <div className="commercial-skeleton" role="status">Carregando métricas…</div> : error ? <p role="alert" className="new-company-message error">{error}</p> : data && <>
      <p>Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. Período mensal: {new Date(data.period.from).toLocaleDateString("pt-BR", { timeZone: "UTC" })} a {new Date(data.period.to).toLocaleDateString("pt-BR", { timeZone: "UTC" })} (UTC).</p>
      {data.companies.total === 0 && <p>Nenhuma empresa cadastrada. <Link href="/super-admin/empresas/nova">Nova empresa</Link></p>}
      {groups.map(group => <section className="dashboard-group" key={group.name}><h2>{group.name}</h2><div className="metric-grid">{group.items.map(([label, value]) => <article className="metric-card" key={label}><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</div></section>)}
      <p>Receita calculada pelo backend sobre pagamentos aprovados, descontando estornos parciais. Receita mensal considera a data de pagamento em UTC. Inativas pode incluir empresas suspensas ou canceladas.</p>
      <section className="commercial-panel"><h2>Webhooks recentes</h2>{data.recentEvents.length ? data.recentEvents.map(event => <p key={event.id}><Link href={`/super-admin/webhooks/${event.id}`}>{event.gateway} · {event.eventType || "Evento"} · {event.status}</Link> — {new Date(event.receivedAt).toLocaleString("pt-BR")}</p>) : <p>Nenhum evento recebido.</p>}</section>
    </>}
  </>;
}
