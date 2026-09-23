"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminSection } from "@/components/admin-section";
import { api, API_URL, jsonBody } from "@/lib/api";
import type { Gateway } from "@/lib/contracts";
const names = { MERCADO_PAGO: "Mercado Pago", STRIPE: "Stripe", PAGBANK: "PagBank" };
const statuses = { NOT_CONFIGURED: "Não configurado", PENDING_VALIDATION: "Validação pendente", CONNECTED: "Conectado", FAILED: "Falha" };
function GatewayForm({ gateway, saved }: { gateway: Gateway; saved: (value: Gateway) => void }) {
  const [environment, setEnvironment] = useState(gateway.environment);
  const [publicId, setPublicId] = useState(gateway.publicId || "");
  const [credentials, setCredentials] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const changedEnvironment = environment !== gateway.environment;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (changedEnvironment && (!credentials || !webhookSecret)) { setMessage("Ao trocar de ambiente, informe as duas novas credenciais. Para removê-las, use o provisionamento administrativo."); return; }
    if (changedEnvironment && !window.confirm("Trocar o ambiente e substituir as credenciais? A integração será desativada.")) return;
    setBusy(true); setMessage("");
    try {
      const value = await api<Gateway>(`/payment-gateways/${gateway.gateway}`, { method: "PATCH", ...jsonBody({ environment, publicId: publicId.trim() || null, ...(credentials ? { credentials } : {}), ...(webhookSecret ? { webhookSecret } : {}) }) });
      saved(value); setMessage("Configuração salva. A integração foi desativada e precisa de nova validação.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { setCredentials(""); setWebhookSecret(""); setBusy(false); }
  }
  async function action(test: boolean) {
    if (!test && !window.confirm(gateway.enabled ? "Desativar este gateway?" : "Ativar este gateway?")) return;
    setBusy(true); setMessage("");
    try {
      await api(`/payment-gateways/${gateway.gateway}${test ? "/test" : ""}`, test ? { method: "POST" } : { method: "PATCH", ...jsonBody({ enabled: !gateway.enabled }) });
      saved(await api<Gateway>(`/payment-gateways/${gateway.gateway}`)); setMessage("Operação concluída.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Operação indisponível."); }
    finally { setBusy(false); }
  }
  return <form className="new-company-section" onSubmit={save} autoComplete="off">
    <h2>{names[gateway.gateway]}</h2><p>{gateway.enabled ? "Ativo" : "Inativo"} · {statuses[gateway.status]}</p>
    <p>Última validação: {gateway.lastValidatedAt ? new Date(gateway.lastValidatedAt).toLocaleString("pt-BR") : "Não realizada"}</p>
    <label>Ambiente<select value={environment} onChange={e => setEnvironment(e.target.value as Gateway["environment"])}><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Produção</option></select></label>
    <label>Identificação pública<input value={publicId} onChange={e => setPublicId(e.target.value)} /></label>
    <label>Nova credencial — {gateway.configured ? "configurada" : "não configurada"}<input type="password" autoComplete="new-password" maxLength={16384} value={credentials} onChange={e => setCredentials(e.target.value)} /></label>
    <label>Novo segredo do webhook — {gateway.webhookConfigured ? "configurado" : "não configurado"}<input type="password" autoComplete="new-password" maxLength={16384} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} /></label>
    <small>Campos de segredo vazios preservam os valores existentes no mesmo ambiente. O formato definitivo depende do adapter oficial; prefira provisionar pelo gerenciador de secrets.</small>
    <code>{API_URL}{gateway.webhookPath}</code>
    <button className="new-company-submit" disabled={busy}>Salvar configuração</button>
    <button type="button" disabled={busy} onClick={() => void action(true)}>Testar conexão</button>
    {!gateway.adapterAvailable && <p>Adapter pendente: o teste retorna indisponibilidade, sem conexão externa real.</p>}
    <button type="button" disabled={busy || (!gateway.enabled && !gateway.adapterAvailable)} onClick={() => void action(false)}>{gateway.enabled ? "Desativar" : "Ativar"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
export default function PaymentsSettings() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setGateways(await api<Gateway[]>("/payment-gateways")); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <AdminSection><main className="new-company-page"><div className="new-company-container"><Link href="/super-admin">← Super Admin</Link><h1>Configurações · Pagamentos</h1><button onClick={() => void load()} disabled={loading}>Atualizar</button>{loading ? <p role="status">Carregando gateways…</p> : error ? <p role="alert">{error}</p> : <div className="gateway-grid">{gateways.map(g => <GatewayForm key={`${g.gateway}-${g.environment}`} gateway={g} saved={value => setGateways(items => items.map(item => item.gateway === value.gateway ? value : item))} />)}</div>}</div></main></AdminSection>;
}
