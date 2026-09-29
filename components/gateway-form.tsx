"use client";
import { FormEvent, useState } from "react";
import { api, API_URL, jsonBody } from "@/lib/api";
import { gatewayNames, gatewayStatuses, gatewayPatch, webhookUrl, date } from "@/lib/commercial";
import type { Gateway } from "@/lib/contracts";
const capabilityLabels = { checkout: "Checkout", recurring: "Recorrência", nativeIdempotency: "Idempotência nativa", cancelAtPeriodEnd: "Cancelamento ao fim do período", webhookManagement: "Gestão de webhook pelo adapter" };
const checkLabels: Record<string, string> = { CREDENTIALS_VALID: "Credencial válida", WEBHOOK_KEY_AVAILABLE: "Chave pública de webhook disponível", UNVERIFIED: "Webhook não verificado", RECURRING_AVAILABLE: "Acesso à recorrência disponível", NOT_TESTED: "Recorrência não testada", RECONCILIATION_UNVERIFIED: "Reconciliação não homologada" };
export function GatewayForm({ gateway, saved }: { gateway: Gateway; saved: (value: Gateway) => void }) {
  const [environment, setEnvironment] = useState(gateway.environment);
  const [publicId, setPublicId] = useState(gateway.publicId || "");
  const [credentials, setCredentials] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [recurringCredentials, setRecurringCredentials] = useState("");
  const [recurringEnabled, setRecurringEnabled] = useState(gateway.capabilities.recurring);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [checks, setChecks] = useState<string[]>([]);
  const pagbank = gateway.gateway === "PAGBANK";
  const url = webhookUrl(gateway, API_URL);
  const dirty = environment !== gateway.environment || publicId !== (gateway.publicId || "") || !!credentials || !!webhookSecret || !!recurringCredentials || recurringEnabled !== gateway.capabilities.recurring;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    let body;
    try { body = gatewayPatch(gateway, { environment, publicId, credentials, webhookSecret, recurringCredentials, recurringEnabled }); }
    catch (err) { setError((err as Error).message); return; }
    if (environment !== gateway.environment && !window.confirm("Trocar o ambiente e substituir as credenciais? A integração será desativada.")) return;
    setBusy(true); setChecks([]);
    try {
      const value = await api<Gateway>(`/payment-gateways/${gateway.gateway}`, { method: "PATCH", ...jsonBody(body) });
      saved(value); setMessage("Configuração salva. Confira o estado retornado antes de habilitar novas cobranças.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { setCredentials(""); setWebhookSecret(""); setRecurringCredentials(""); setBusy(false); }
  }
  async function action(test: boolean) {
    if (busy || dirty || stale) return;
    if (!test && !window.confirm(gateway.enabled ? "Desabilitar novas cobranças neste gateway?" : "Habilitar novas cobranças neste gateway?")) return;
    setBusy(true); setError(""); setMessage(""); setChecks([]);
    try {
      if (test) {
        const result = await api<{ connected: boolean; checks?: Record<string, string> }>(`/payment-gateways/${gateway.gateway}/test`, { method: "POST" });
        setChecks(Object.values(result.checks ?? {}).filter(value => Object.hasOwn(checkLabels, value)));
        setMessage(result.connected ? "Teste de conectividade concluído. Isso não comprova entrega de webhook ou homologação financeira." : "Teste concluído. Confira o estado da configuração.");
      } else {
        await api(`/payment-gateways/${gateway.gateway}`, { method: "PATCH", ...jsonBody({ enabled: !gateway.enabled }) });
        setMessage("Solicitação concluída.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Operação indisponível."); }
    finally {
      try { saved(await api<Gateway>(`/payment-gateways/${gateway.gateway}`)); }
      catch { setStale(true); setError("Não foi possível atualizar o estado. Recarregue a configuração antes de continuar."); }
      setBusy(false);
    }
  }
  return <>
    <header className="commercial-heading"><div><p>PROVEDOR DE PAGAMENTO</p><h1>{gatewayNames[gateway.gateway]}</h1><div className="commercial-badges"><span>{gateway.enabled ? "Habilitado" : "Desabilitado"}</span><span>{gateway.environment === "SANDBOX" ? "Sandbox" : "Produção"}</span><span>{gatewayStatuses[gateway.status] ?? gateway.status}</span></div></div></header>
    <section className="commercial-panel"><h2>Estado da integração</h2><dl className="commercial-details"><div><dt>Credencial armazenada</dt><dd>{gateway.configured ? "Configurada" : "Não configurada"}</dd></div><div><dt>Última verificação</dt><dd>{date(gateway.lastValidatedAt)}</dd></div><div><dt>Webhook</dt><dd>{gateway.webhookStatus === "REMOTE_KEY_UNVERIFIED" ? "Chave remota · entrega não verificada" : gateway.webhookStatus === "CONFIGURED_UNVERIFIED" ? "Segredo configurado · entrega não verificada" : gateway.webhookStatus === "NOT_CONFIGURED" ? "Não configurado" : "Estado não informado"}</dd></div></dl>
    <h3>Capacidades informadas</h3><ul className="capability-list">{Object.entries(capabilityLabels).map(([key, label]) => <li key={key}>{label}: <strong>{gateway.capabilities[key as keyof typeof capabilityLabels] ? "Disponível" : "Indisponível"}</strong></li>)}</ul>
    {gateway.capabilities.limitation && <p className="commercial-notice">{gateway.capabilities.limitation}</p>}
    {checks.length > 0 && <ul aria-label="Resultado do teste">{checks.map(check => <li key={check}>{checkLabels[check]}</li>)}</ul>}
    </section>
    <form className="commercial-panel commercial-form" onSubmit={save} autoComplete="off"><h2>Configuração</h2>
      <fieldset disabled={busy || stale}><label>Ambiente<select value={environment} onChange={e => setEnvironment(e.target.value as Gateway["environment"])}><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Produção</option></select></label>
      <label>Identificação pública<input value={publicId} onChange={e => setPublicId(e.target.value)} /></label>
      <label>{gateway.gateway === "ASAAS" ? "Nova API key" : "Nova credencial"}<input type="password" autoComplete="new-password" maxLength={16384} value={credentials} onChange={e => setCredentials(e.target.value)} /></label>
      {pagbank ? <><label>Nova credencial de recorrência<input type="password" autoComplete="new-password" maxLength={16384} value={recurringCredentials} onChange={e => setRecurringCredentials(e.target.value)} /></label><p>Credencial de recorrência: {gateway.recurringConfigured ? "configurada" : "não configurada"}.</p><label className="commercial-check"><input type="checkbox" checked={recurringEnabled} onChange={e => setRecurringEnabled(e.target.checked)} />Habilitar capacidade de recorrência</label><p>A chave pública de webhook é consultada pelo backend no PagBank.</p></> : <label>{gateway.gateway === "ASAAS" ? "Novo token dedicado de webhook (diferente da API key)" : "Novo segredo de webhook"}<input type="password" autoComplete="new-password" maxLength={16384} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} /></label>}
      <p>Segredos são somente de escrita. Campos vazios preservam as credenciais existentes no mesmo ambiente. Substituir credenciais exige nova validação.</p>
      <button className="new-company-submit" disabled={!dirty}>Salvar configuração</button></fieldset>
    </form>
    <section className="commercial-panel"><h2>Webhook</h2>{url ? <code className="commercial-url">{url}</code> : <p>URL não disponível.</p>}<p>Configurar uma credencial não comprova o recebimento de eventos.</p></section>
    <div className="commercial-actions"><button disabled={busy || stale || dirty || !gateway.configured} onClick={() => void action(true)}>Testar conexão</button><button disabled={busy || stale || dirty || (!gateway.enabled && (!gateway.adapterAvailable || gateway.status !== "CONNECTED" || (!pagbank && !gateway.webhookConfigured)))} onClick={() => void action(false)}>{gateway.enabled ? "Desabilitar" : "Habilitar"}</button></div>
    {dirty && <p>Salve as alterações antes de testar ou habilitar.</p>}{busy && <p role="status">Processando…</p>}{error && <p role="alert" className="commercial-notice">{error}</p>}{message && <p role="status" className="commercial-notice">{message}</p>}
  </>;
}
