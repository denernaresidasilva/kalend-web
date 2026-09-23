"use client";
import Link from "next/link";
import { AdminSection } from "@/components/admin-section";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Gateway, WebhookMetadata } from "@/lib/contracts";
export default function WebhookDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<WebhookMetadata | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [detail, configs] = await Promise.all([api<WebhookMetadata>(`/webhooks/${encodeURIComponent(id)}`), api<Gateway[]>("/payment-gateways")]); setEvent(detail); setGateways(configs); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function reprocess() {
    if (!window.confirm("Reprocessar este evento consultando o provedor?")) return;
    setLoading(true); setError("");
    try { await api(`/webhooks/${encodeURIComponent(id)}/reprocess`, { method: "POST" }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível reprocessar."); }
    finally { setLoading(false); }
  }
  const eligible = event?.status === "FAILED" && !!event.paymentId && gateways.some(g => g.gateway === event.gateway && g.adapterAvailable);
  return <AdminSection><main className="new-company-page"><div className="new-company-container"><Link href="/super-admin/webhooks">← Webhooks</Link><h1>Detalhes do webhook</h1><button disabled={loading} onClick={() => void load()}>Atualizar</button>{error && <p role="alert">{error}</p>}{loading ? <p role="status">Carregando…</p> : event && <section className="new-company-section"><dl className="webhook-details">{[
    ["Gateway", event.gateway], ["Ambiente", event.environment], ["Evento", event.eventType], ["ID externo", event.externalEventId], ["Empresa", event.companyId], ["Pagamento", event.paymentId], ["Status", event.status], ["Recebido em", new Date(event.receivedAt).toLocaleString("pt-BR")], ["Processado em", event.processedAt ? new Date(event.processedAt).toLocaleString("pt-BR") : null], ["Tentativas", event.attempts], ["Erro", event.errorMessage ? "Falha no processamento." : null],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl><button className="new-company-submit" disabled={!eligible || loading} onClick={() => void reprocess()}>Reprocessar</button><p>Disponível apenas para eventos com falha, pagamento conhecido e adapter disponível.</p></section>}</div></main></AdminSection>;
}
