"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { jsonBody, tenantApi } from "@/lib/api";
import { getCommercialState } from "@/lib/commercial-state";
import { useAuth } from "./auth-provider";
import type { PendingCheckout, Regularization } from "@/lib/contracts";
import { PlanCatalog } from "./plans/plan-catalog";
import { PlanFaq } from "./plans/plan-faq";
import { selectPlanInterval } from "@/lib/plan-presentation";
import { commercialStatuses, date, gatewayNames, money, safeHttpsUrl } from "@/lib/commercial";
export function PendingPayment({ payment }: { payment: PendingCheckout }) {
  const url = payment.creationState === "CREATED" ? safeHttpsUrl(payment.checkoutUrl) : null;
  return <section className="commercial-panel"><h2>Pagamento pendente</h2><p>Referência: {payment.id}</p><p>{gatewayNames[payment.gateway as keyof typeof gatewayNames] ?? payment.gateway} · {payment.billingInterval === "YEARLY" ? "Anual" : "Mensal"}</p>
    {url ? <a className="commercial-primary" href={url} target="_blank" rel="noopener noreferrer">Continuar pagamento ↗</a> : <p>O pagamento aguarda confirmação ou reconciliação. Atualize o estado antes de tentar outra compra. Se continuar pendente, entre em contato com o responsável pelo atendimento.</p>}
    <p>O retorno do provedor não confirma pagamento. A assinatura será atualizada após confirmação pelo backend.</p>
  </section>;
}
export function RegularizationPanel({ companyId, state, recovery = false }: { companyId: string; state?: Regularization; recovery?: boolean }) {
  const { profile } = useAuth();
  const userId = profile?.user.id ?? "";
  const [localData, setData] = useState<Regularization | null>(null);
  const data = state ?? localData;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [planId, setPlanId] = useState("");
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [gateway, setGateway] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [taxId, setTaxId] = useState("");
  const operation = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async (refresh = true) => {
    setLoading(true); setError("");
    try { setData(await getCommercialState(companyId, userId, refresh)); }
    catch (err) { setData(null); setError(err instanceof Error ? err.message : "Não foi possível carregar a assinatura."); }
    finally { setLoading(false); }
  }, [companyId, userId]);
  useEffect(() => { const refresh = () => { if (!operation.current) void load(); }; const timer = setTimeout(() => void load(false), 0); window.addEventListener("focus", refresh); return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); }; }, [load]);
  const plan = data?.plans?.find(p => p.id === planId);
  const provider = data?.gateways?.find(g => g.provider === gateway);
  const selectedPrice = plan ? interval === "YEARLY" ? plan.yearlyPriceCents : plan.monthlyPriceCents : null;
  const checkoutPriceAvailable = typeof selectedPrice === "number" && selectedPrice > 0;
  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (operation.current || !plan || !provider || data?.pendingCheckout || !checkoutPriceAvailable) return;
    if (interval === "YEARLY" && plan.yearlyPriceCents === null) return;
    if (recurring && !provider.capabilities.recurring) return;
    operation.current = true; setBusy(true); setError(""); setMessage("");
    const signature = JSON.stringify([companyId, planId, interval, gateway, recurring, provider.environment]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    try {
      await tenantApi(companyId, "/billing/checkout", { method: "POST", ...jsonBody({ planId, billingInterval: interval, gateway, idempotencyKey: attempt.current.key, recurring, ...(gateway === "ASAAS" ? { taxId: taxId.replace(/\D/g, "") } : {}) }) });
      setMessage("Solicitação de checkout recebida. Confira o pagamento pendente abaixo.");
      await load();
    } catch (err) {
      const failure = err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.";
      await load();
      setError(failure);
    } finally { setTaxId(""); operation.current = false; setBusy(false); }
  }
  async function cancel() {
    if (operation.current || !data?.subscription || !window.confirm("Cancelar a assinatura imediatamente? O acesso comercial poderá ser encerrado. Esta ação não solicita estorno.")) return;
    operation.current = true; setBusy(true); setError(""); setMessage("");
    try { await tenantApi(companyId, `/billing/subscriptions/${encodeURIComponent(data.subscription.id)}/cancel`, { method: "POST", ...jsonBody({ atPeriodEnd: false }) }); await load(); setMessage("Solicitação de cancelamento concluída. Confira o estado atualizado."); }
    catch (err) { const failure = (err as Error).message; await load(); setError(failure); }
    finally { operation.current = false; setBusy(false); }
  }
  return <div className="kalend-ui k-billing-page"><header className="commercial-heading"><div><h2>Assinatura e pagamentos</h2><p>Escolha o plano adequado à empresa. O plano do trial não limita sua escolha.</p></div><button disabled={loading || busy} onClick={() => void load()}>Atualizar estado</button></header>
    {loading && !state ? <div role="status" className="commercial-skeleton">Carregando assinatura e planos…</div> : <>
      {error && <div className="commercial-notice" role="alert"><p>{error}</p><button disabled={busy} onClick={() => void load()}>Tentar novamente</button></div>}
      {data && <><section className="commercial-panel"><h2>{commercialStatuses[data.financial.status ?? "NO_SUBSCRIPTION"] ?? data.financial.status ?? "Sem assinatura"}</h2><p>{!data.financial.requiresAction && !data.trial.expired ? "Acesso comercial permitido pela assinatura." : data.trial.expired ? "Seu período de teste terminou. Escolha um plano para regularizar a assinatura." : "Sua assinatura precisa de regularização para liberar o acesso comercial."}</p><p>Sua sessão permanece autenticada.</p>
        {data.subscription && <><dl className="commercial-details"><div><dt>Plano atual</dt><dd>{data.subscription.planName}</dd></div><div><dt>Intervalo</dt><dd>{data.subscription.billingInterval === "YEARLY" ? "Anual" : "Mensal"}</dd></div><div><dt>Fim do trial</dt><dd>{date(data.subscription.trialEndsAt)}</dd></div><div><dt>Fim do período</dt><dd>{date(data.subscription.currentPeriodEnd)}</dd></div>{data.subscription.graceEndsAt && <div><dt>Fim do período de graça</dt><dd>{date(data.subscription.graceEndsAt)}</dd></div>}<div><dt>Cancelamento ao fim do período</dt><dd>{data.subscription.cancelAtPeriodEnd ? "Solicitado" : "Não solicitado"}</dd></div></dl>{!recovery && data.subscription.status !== "CANCELED" && <button disabled={busy} onClick={() => void cancel()}>Cancelar assinatura imediatamente</button>}</>}
      </section>
      {data.pendingCheckout ? <PendingPayment payment={data.pendingCheckout} /> : <form id="escolher-plano" className="commercial-panel commercial-form" onSubmit={checkout}><h2>Escolher um plano</h2><p>Preços e disponibilidade informados pelo serviço comercial. Compras durante assinatura paga vigente dependem das regras do backend; não há troca com prorrata.</p><fieldset disabled={busy}>
        <PlanCatalog plans={(data.plans ?? [])} interval={interval} onInterval={setInterval} selectedId={planId} disabled={busy} onSelect={p => { setPlanId(p.id); setInterval(selectPlanInterval(p, interval)); }} />
        <label>Meio de pagamento<select value={gateway} onChange={e => { setGateway(e.target.value); setRecurring(false); setTaxId(""); }} required><option value="">Selecione um provedor</option>{(data.gateways ?? []).filter(g => g.capabilities.checkout).map(g => <option key={g.provider} value={g.provider}>{gatewayNames[g.provider]} · {g.environment === "SANDBOX" ? "Sandbox" : "Produção"}</option>)}</select></label>
        {!(data.gateways ?? []).length && <p>Nenhum provedor habilitado para pagamento no momento.</p>}
        {provider?.capabilities.limitation && <p className="commercial-notice">{provider.capabilities.limitation}</p>}
        {provider?.capabilities.recurring && <label className="commercial-check"><input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />Pagamento recorrente</label>}
        {gateway === "ASAAS" && <label>CPF ou CNPJ do pagador<input required inputMode="numeric" autoComplete="off" maxLength={18} value={taxId} onChange={e => setTaxId(e.target.value)} /><small>Enviado apenas para iniciar esta cobrança.</small></label>}
        {plan && <p>{checkoutPriceAvailable ? <>Total selecionado: {money(selectedPrice!)}. O backend valida o valor ao criar a compra.</> : "Preço não configurado para este intervalo."}</p>}
        <button className="commercial-primary" disabled={!plan || !provider || !provider.capabilities.checkout || !checkoutPriceAvailable}>Iniciar checkout</button>
      </fieldset></form>}
      </>}
    <PlanFaq />{data && !data.pendingCheckout && (data.plans ?? []).length > 0 && <section className="k-plans-final"><h2>Pronto para escolher?</h2><p>Revise o plano, o período e o meio de pagamento antes de continuar.</p><a className="k-link-button" href="#escolher-plano">Revisar escolha e continuar</a></section>}</>}{busy && <p role="status">Processando solicitação…</p>}{message && <p className="commercial-notice" role="status">{message}</p>}
  </div>;
}
