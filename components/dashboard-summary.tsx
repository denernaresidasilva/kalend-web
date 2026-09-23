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
  return <>
    <button className="new-company-submit" onClick={() => void load()} disabled={loading}>Atualizar</button>
    {loading ? <div className="companies-state" role="status">Carregando métricas…</div> : error ? <p role="alert" className="new-company-message error">{error}</p> : data && <>
      <p>Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. Receita mensal por pagamento aprovado no mês UTC.</p>
      {data.companies.total === 0 && <p>Nenhuma empresa cadastrada. <Link href="/super-admin/empresas/nova">Nova empresa</Link></p>}
      <section className="metric-grid">{[
        ["Empresas", data.companies.total], ["Empresas ativas", data.companies.active], ["Empresas em trial", data.companies.trial], ["Novas empresas no mês UTC", data.companies.new],
        ["Empresas suspensas", data.companies.suspended], ["Empresas canceladas", data.companies.canceled], ["Empresas inativas", data.companies.inactive], ["Usuários", data.users.total],
        ["Assinaturas", data.subscriptions.total], ["Assinaturas ativas", data.subscriptions.active], ["Assinaturas em trial", data.subscriptions.trialing], ["Assinaturas vencidas", data.subscriptions.pastDue], ["Assinaturas canceladas", data.subscriptions.canceled], ["Assinaturas expiradas", data.subscriptions.expired],
        ["Receita aprovada", money(data.payments.revenueCents)], ["Receita mensal", money(data.payments.monthlyRevenueCents)],
        ["Pagamentos", data.payments.total], ["Aprovados", data.payments.approved], ["Pendentes", data.payments.pending], ["Falhos", data.payments.failed], ["Cancelados", data.payments.canceled], ["Estornados", data.payments.refunded],
      ].map(([label, value]) => <article className="metric-card" key={label}><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</section>
      <section className="new-company-section"><h2>Webhooks recentes</h2>{data.recentEvents.length ? data.recentEvents.map(event => <p key={event.id}><Link href={`/super-admin/webhooks/${event.id}`}>{event.gateway} · {event.eventType || "Evento"} · {event.status}</Link> — {new Date(event.receivedAt).toLocaleString("pt-BR")}</p>) : <p>Nenhum evento recebido.</p>}</section>
    </>}
  </>;
}
