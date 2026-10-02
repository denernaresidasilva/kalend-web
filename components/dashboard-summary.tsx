"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Summary } from "@/lib/contracts";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { EmptyState } from "@/components/ui/empty-state";
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
  const metrics: Array<[string, string | number]> = data ? [
    ["Empresas", data.companies.total], ["Empresas ativas", data.companies.active],
    ["Empresas em trial", data.companies.trial], ["Assinaturas ativas", data.subscriptions.active],
    ["Receita do mês (UTC)", money(data.payments.monthlyRevenueCents)], ["Receita acumulada", money(data.payments.revenueCents)],
    ["Pagamentos pendentes", data.payments.pending], ["Novas empresas no mês (UTC)", data.companies.new],
  ] : [];
  return <>
    {loading ? <Skeleton label="Carregando métricas…" /> : error ? <><Alert tone="danger">{error}</Alert><Button variant="secondary" onClick={() => void load()}>Tentar novamente</Button></> : data && <>
      <section aria-label="Métricas principais" className="k-grid k-dashboard-metrics">{metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</section>
      {data.companies.total === 0 && <p>Nenhuma empresa cadastrada. <Link href="/super-admin/empresas/nova">Cadastrar empresa</Link></p>}
      <DashboardCharts data={data} />
      <details className="k-dashboard-details"><summary>Mais indicadores</summary><div className="k-grid">{([
        ["Usuários", data.users.total], ["Empresas inativas", data.companies.inactive],
        ["Assinaturas", data.subscriptions.total], ["Pagamentos", data.payments.total],
      ] as Array<[string, number]>).map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div><p className="k-muted">Receitas líquidas de estornos parciais sobre pagamentos aprovados. Inativas pode incluir empresas suspensas ou canceladas.</p></details>
      <Card><h2>Webhooks recentes</h2>{data.recentEvents.length ? data.recentEvents.map(event => <p key={event.id}><Link href={`/super-admin/webhooks/${event.id}`}>{event.gateway} · {event.eventType || "Evento"} · {event.status}</Link> — {new Date(event.receivedAt).toLocaleString("pt-BR")}</p>) : <EmptyState title="Nenhum evento recebido" />}</Card>
    </>}
  </>;
}
