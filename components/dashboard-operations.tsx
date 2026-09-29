"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Gateway } from "@/lib/contracts";
import { GatewayCards } from "./gateway-cards";
type WebhookSummary = { total: number; received: number; processing: number; processed: number; failed: number; ignored: number };
export function DashboardOperations() {
  const [gateways, setGateways] = useState<Gateway[] | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const results = await Promise.allSettled([api<Gateway[]>("/payment-gateways"), api<WebhookSummary>("/webhooks/summary")]);
    setGateways(results[0].status === "fulfilled" ? results[0].value : null);
    setWebhooks(results[1].status === "fulfilled" ? results[1].value : null);
    if (results.some(result => result.status === "rejected")) setError("Não foi possível carregar todos os dados de operação.");
    setLoading(false);
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <section className="dashboard-group"><h2>Operação de pagamentos</h2><button className="new-company-submit" disabled={loading} onClick={() => void load()}>{error ? "Tentar novamente" : "Atualizar operação"}</button>{loading ? <p role="status">Carregando operação…</p> : <>{error && <p role="alert">{error}</p>}{gateways && <GatewayCards gateways={gateways} />}{webhooks && <><h3>Webhooks</h3><div className="metric-grid">{[["Total", webhooks.total], ["Recebidos", webhooks.received], ["Em processamento", webhooks.processing], ["Processados", webhooks.processed], ["Falhos", webhooks.failed], ["Ignorados", webhooks.ignored]].map(([label, value]) => <article key={label} className="metric-card"><span className="metric-label">{label}</span><strong>{value}</strong></article>)}</div></>}</>}</section>;
}
