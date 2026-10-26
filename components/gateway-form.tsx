"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { api, API_URL, jsonBody } from "@/lib/api";
import { gatewayNames, gatewayStatuses, gatewayPatch, webhookUrl, date } from "@/lib/commercial";
import type { Gateway } from "@/lib/contracts";

const setup = {
  PAGBANK: {
    credentialLabel: "Token de API do Checkout PagBank",
    credentialHelp: "Obrigatório para criar checkouts hospedados. Use um token do mesmo ambiente selecionado.",
    docsUrl: "https://developer.pagbank.com.br/docs/checkout",
    webhookLabel: "Webhook PagBank",
    webhookHelp: "O Kalend inclui esta URL em notification_urls e payment_notification_urls em cada Checkout. O backend consulta a chave pública de assinatura no PagBank usando o token; não informe Public Key nem segredo de webhook.",
    steps: ["Não é necessário cadastrar manualmente uma URL no painel para o Checkout hospedado integrado.", "A URL acima segue no payload de cada checkout; o backend valida x-payload-signature com a chave pública de webhook obtida no PagBank."],
  },
  MERCADO_PAGO: {
    credentialLabel: "Access Token do Mercado Pago",
    credentialHelp: "Obrigatório para criar Preferências do Checkout Pro no backend. Public Key, Client ID e Client Secret não são usados por esta integração.",
    webhookLabel: "Segredo de assinatura dos Webhooks",
    webhookHelp: "Segredo de assinatura gerado para a aplicação no painel de Webhooks. É diferente do Access Token; configure a URL de teste ou produção no seletor correspondente.",
    docsUrl: "https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications",
    steps: ["Em Suas integrações → Webhooks, configure a URL HTTPS acima no modo correspondente e habilite Pagamentos. A integração também informa notification_url em cada preferência.", "Copie o segredo de assinatura gerado no painel e salve-o no campo de webhook. Para recorrência, habilite também os tópicos de assinatura que a conta disponibilizar."],
  },
  STRIPE: {
    credentialLabel: "Chave secreta da API Stripe",
    credentialHelp: "Obrigatória para criar Checkout Sessions no backend. Use sk_test_ no Sandbox e sk_live_ em Produção. Publishable Key não é usada.",
    webhookLabel: "Signing secret do endpoint Stripe",
    webhookHelp: "Segredo whsec_ gerado para este endpoint e modo; não é a chave secreta da API.",
    docsUrl: "https://docs.stripe.com/checkout/quickstart",
    steps: ["No Stripe Dashboard/Workbench, crie um endpoint HTTPS com a URL acima no mesmo modo (test ou live).", "Selecione estes eventos: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled, invoice.paid, invoice.payment_failed, invoice.voided, invoice.marked_uncollectible, charge.refunded, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, customer.subscription.paused e customer.subscription.resumed.", "Copie o signing secret whsec_ desse endpoint e salve-o no campo de webhook."],
  },
  ASAAS: {
    credentialLabel: "Chave de API Asaas",
    credentialHelp: "Obrigatória no header access_token. A chave Sandbox e a de Produção são diferentes; selecione o mesmo ambiente da chave.",
    webhookLabel: "Token de autenticação do webhook Asaas",
    webhookHelp: "Token authToken configurado no webhook (32–255 caracteres, sem espaços). Não use a API Key aqui; o Asaas envia este valor no header asaas-access-token.",
    docsUrl: "https://docs.asaas.com/docs/create-new-webhook-via-web-application",
    steps: ["No painel Asaas do ambiente selecionado, crie um webhook usando a URL HTTPS acima, API versão 3, envio sequencial e um e-mail de contato válido da conta.", "Gere um authToken próprio para o webhook e informe-o abaixo. Ele deve ser diferente da API Key.", "Selecione os eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_REFUND_IN_PROGRESS, PAYMENT_DELETED, PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_INACTIVATED e SUBSCRIPTION_DELETED."],
  },
} as const;
const capabilityLabels = { checkout: "Checkout", recurring: "Recorrência", nativeIdempotency: "Idempotência nativa", cancelAtPeriodEnd: "Cancelamento ao fim do período", webhookManagement: "Gestão de webhook pelo adapter" };
const checkLabels: Record<string, string> = { CREDENTIALS_VALID: "Credencial válida", WEBHOOK_KEY_AVAILABLE: "Chave pública de webhook disponível", UNVERIFIED: "Webhook não verificado", RECURRING_AVAILABLE: "Acesso à recorrência disponível", NOT_TESTED: "Recorrência não testada", RECONCILIATION_UNVERIFIED: "Reconciliação não homologada" };

export function GatewayForm({ gateway, saved, webhookMode = false }: { gateway: Gateway; saved: (value: Gateway) => void; webhookMode?: boolean }) {
  const [environment, setEnvironment] = useState(gateway.environment);
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
  const instructions = setup[gateway.gateway];
  const url = webhookUrl(gateway, API_URL);
  const dirty = environment !== gateway.environment || !!credentials || !!webhookSecret || !!recurringCredentials || recurringEnabled !== gateway.capabilities.recurring;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    let body;
    try { body = gatewayPatch(gateway, { environment, credentials, webhookSecret, recurringCredentials, recurringEnabled }); }
    catch (err) { setError((err as Error).message); return; }
    if (environment !== gateway.environment && !window.confirm(pagbank && !recurringEnabled ? "Trocar o ambiente e substituir o token de checkout? A integração será desativada." : "Trocar o ambiente e substituir as credenciais necessárias? A integração será desativada.")) return;
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
      <fieldset disabled={busy || stale}><label>Ambiente<select value={environment} onChange={e => setEnvironment(e.target.value as Gateway["environment"])}><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Produção</option></select></label><p>O Kalend mantém um ambiente configurado por gateway por vez. Ao alternar, substitua as credenciais pelo conjunto do novo ambiente; a troca desabilita a integração e pode ser bloqueada quando há histórico financeiro.</p>
      {(!webhookMode || environment !== gateway.environment) && <><label>{instructions.credentialLabel}<input type="password" autoComplete="new-password" maxLength={16384} value={credentials} onChange={e => setCredentials(e.target.value)} aria-describedby="gateway-credential-help" /></label><p id="gateway-credential-help">{instructions.credentialHelp}</p></>}
      {pagbank ? <><label className="commercial-check"><input type="checkbox" checked={recurringEnabled} onChange={e => setRecurringEnabled(e.target.checked)} />Habilitar recorrência PagBank</label>{recurringEnabled && <><label>{gateway.recurringConfigured ? "Substituir token da API de Assinaturas (opcional)" : "Token da API de Assinaturas PagBank"}<input type="password" autoComplete="new-password" maxLength={16384} value={recurringCredentials} onChange={e => setRecurringCredentials(e.target.value)} required={!gateway.recurringConfigured} /></label><p>Necessário somente com recorrência habilitada; é separado do token do Checkout hospedado. Estado: {gateway.recurringConfigured ? "configurado" : "não configurado"}. Campo vazio preserva o token neste ambiente.</p></>}<p>{instructions.webhookHelp}</p></> : webhookMode ? <><label>{instructions.webhookLabel}<input type="password" autoComplete="new-password" maxLength={gateway.gateway === "ASAAS" ? 255 : 16384} minLength={gateway.gateway === "ASAAS" ? 32 : undefined} pattern={gateway.gateway === "ASAAS" ? "\\S+" : undefined} required={!gateway.webhookConfigured} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} aria-describedby="gateway-webhook-help" /></label><p id="gateway-webhook-help">{instructions.webhookHelp}</p></> : <Link href={`/super-admin/configuracoes/webhooks/${gateway.gateway}`}>Configurar segredo de webhook</Link>}
      <p>Segredos são somente de escrita e nunca voltam em texto aberto. Campos vazios preservam as credenciais existentes no mesmo ambiente. Alterar credenciais exige nova validação.</p>
      <button className="new-company-submit" disabled={!dirty}>Salvar configuração</button></fieldset>
    </form>
    <section className="commercial-panel"><h2>{instructions.webhookLabel}</h2>{url ? <code className="commercial-url">{url}</code> : <p>URL não disponível; confira BILLING_PUBLIC_API_URL.</p>}<ol>{instructions.steps.map(step => <li key={step}>{step}</li>)}</ol>{!pagbank && <Link href={`/super-admin/configuracoes/webhooks/${gateway.gateway}`}>Configurar credencial do webhook</Link>}<p><a href={instructions.docsUrl} target="_blank" rel="noreferrer">Documentação oficial {gatewayNames[gateway.gateway]}</a></p><p>Configuração salva não comprova o recebimento de eventos.</p></section>
    <div className="commercial-actions"><button disabled={busy || stale || dirty || !gateway.configured} onClick={() => void action(true)}>Testar conexão</button><button disabled={busy || stale || dirty || (!gateway.enabled && (!gateway.adapterAvailable || gateway.status !== "CONNECTED" || (!pagbank && !gateway.webhookConfigured)))} onClick={() => void action(false)}>{gateway.enabled ? "Desabilitar" : "Habilitar"}</button></div>
    {dirty && <p>Salve as alterações antes de testar ou habilitar.</p>}{busy && <p role="status">Processando…</p>}{error && <p role="alert" className="commercial-notice">{error}</p>}{message && <p role="status" className="commercial-notice">{message}</p>}
  </>;
}
