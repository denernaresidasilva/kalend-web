"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Gateway } from "@/lib/contracts";
import { GatewayCards } from "./gateway-cards";
import Link from "next/link";
import { Button } from "./ui/button";
import { Loading } from "./ui/loading";
import { Alert } from "./ui/alert";
import { MetricCard } from "./ui/metric-card";
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
  return <section className="k-section"><h2>Operação de pagamentos</h2><div className="k-actions"><Button variant="secondary" loading={loading} onClick={() => void load()}>{error ? "Tentar novamente" : "Atualizar operação"}</Button><Link href="/super-admin/configuracoes">Configurações</Link></div><p className="k-muted">Estados informados pelos provedores. Configuração salva não comprova conexão ou homologação financeira.</p>{loading ? <Loading>Carregando operação…</Loading> : <>{error && <Alert tone="danger">{error}</Alert>}{gateways && <GatewayCards gateways={gateways} />}{webhooks && <><h3>Webhooks</h3><div className="k-grid">{[["Total", webhooks.total], ["Recebidos", webhooks.received], ["Em processamento", webhooks.processing], ["Processados", webhooks.processed], ["Falhos", webhooks.failed], ["Ignorados", webhooks.ignored]].map(([label, value]) => <MetricCard key={label} label={String(label)} value={value} />)}</div></>}</>}</section>;
}
