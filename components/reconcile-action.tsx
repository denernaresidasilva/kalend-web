"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { date } from "@/lib/commercial";
type Reconciliation = { expired: number; reconciledAt: string; paymentsChecked: number; paymentsFailed: number; batchLimit: number };
export function ReconcileAction({ refreshed }: { refreshed: () => void }) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Reconciliation | null>(null);
  const [error, setError] = useState("");
  async function reconcile() {
    if (running.current || !window.confirm("Consultar os provedores e reconciliar pagamentos e períodos comerciais? Esta operação pode atualizar assinaturas e acessos conforme o backend.")) return;
    running.current = true; setBusy(true); setError(""); setResult(null);
    try { setResult(await api<Reconciliation>("/billing/reconcile", { method: "POST" })); refreshed(); }
    catch (err) { setError(err instanceof Error ? err.message : "Reconciliação indisponível."); }
    finally { running.current = false; setBusy(false); }
  }
  return <section className="commercial-panel"><h2>Reconciliação</h2><p>Consulta os provedores e atualiza o estado comercial no backend. A execução é manual e limitada ao lote informado pelo serviço.</p><button className="new-company-submit" disabled={busy} onClick={() => void reconcile()}>{busy ? "Reconciliando…" : "Reconciliar agora"}</button>{error && <p role="alert">{error}</p>}{result && <p role="status">Verificados: {result.paymentsChecked} · Falhas: {result.paymentsFailed} · Expirados: {result.expired} · Limite do lote: {result.batchLimit}. Atualizado em {date(result.reconciledAt)}.</p>}</section>;
}
