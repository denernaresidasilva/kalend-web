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
  const groups: Array<{ name: string; items: Array<[string, string | number]> }> = data ? [
    { name: "Resumo", items: [["Empresas", data.companies.total], ["Usuários", data.users.total], ["Assinaturas ativas", data.subscriptions.active], ["Receita do mês UTC", money(data.payments.monthlyRevenueCents)]] },
    { name: "Empresas", items: [["Total", data.companies.total], ["Ativas", data.companies.active], ["Em trial", data.companies.trial], ["Novas no mês UTC", data.companies.new], ["Suspensas", data.companies.suspended], ["Canceladas", data.companies.canceled], ["Inativas", data.companies.inactive], ["Usuários", data.users.total]] },
    { name: "Assinaturas", items: [["Total", data.subscriptions.total], ["Ativas", data.subscriptions.active], ["Em trial", data.subscriptions.trialing], ["Em atraso", data.subscriptions.pastDue], ["Canceladas", data.subscriptions.canceled], ["Expiradas", data.subscriptions.expired]] },
    { name: "Financeiro", items: [["Receita após estornos", money(data.payments.revenueCents)], ["Receita do mês UTC após estornos", money(data.payments.monthlyRevenueCents)], ["Pagamentos", data.payments.total], ["Aprovados", data.payments.approved], ["Pendentes", data.payments.pending], ["Falhos", data.payments.failed], ["Cancelados", data.payments.canceled], ["Estornos totais", data.payments.refunded]] },
  ] : [];
  return <><Button variant="secondary" onClick={() => void load()} loading={loading}>{error ? "Tentar novamente" : "Atualizar métricas"}</Button>
    {loading ? <Skeleton label="Carregando métricas…" /> : error ? <Alert tone="danger">{error}</Alert> : data && <>
      <p className="k-muted">Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. Período mensal: {new Date(data.period.from).toLocaleDateString("pt-BR", { timeZone: "UTC" })} a {new Date(data.period.to).toLocaleDateString("pt-BR", { timeZone: "UTC" })} (UTC).</p>
      {data.companies.total === 0 && <p>Nenhuma empresa cadastrada. <Link href="/super-admin/empresas/nova">Nova empresa</Link></p>}
      {groups.map(group => <section className="k-section" key={group.name}><h2>{group.name}</h2><div className="k-grid">{group.items.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div></section>)}
      <p className="k-muted">Receita calculada pelo backend sobre pagamentos aprovados, descontando estornos parciais. Receita mensal considera a data de pagamento em UTC. Inativas pode incluir empresas suspensas ou canceladas.</p>
      <Card><h2>Webhooks recentes</h2>{data.recentEvents.length ? data.recentEvents.map(event => <p key={event.id}><Link href={`/super-admin/webhooks/${event.id}`}>{event.gateway} · {event.eventType || "Evento"} · {event.status}</Link> — {new Date(event.receivedAt).toLocaleString("pt-BR")}</p>) : <EmptyState title="Nenhum evento recebido" />}</Card>
    </>}
  </>;
}
