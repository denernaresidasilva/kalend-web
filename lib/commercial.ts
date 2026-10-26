import type { Gateway } from "./contracts";
export const gatewayNames = { MERCADO_PAGO: "Mercado Pago", STRIPE: "Stripe", PAGBANK: "PagBank", ASAAS: "Asaas" };
export const gatewayStatuses: Record<string, string> = { NOT_CONFIGURED: "Não configurado", PENDING_VALIDATION: "Validação pendente", CONNECTED: "Credencial validada", FAILED: "Validação falhou" };
export const commercialStatuses: Record<string, string> = {
  PENDING: "Pendente", ACTIVE: "Ativa", TRIALING: "Em trial", TRIAL_EXPIRED: "Trial encerrado",
  PAST_DUE: "Em atraso", SUSPENDED: "Suspensa", CANCELED: "Cancelada", EXPIRED: "Expirada", NO_SUBSCRIPTION: "Sem assinatura",
  APPROVED: "Aprovado", FAILED: "Falhou", OVERDUE: "Em atraso", REFUNDED: "Estorno total",
};
export const money = (cents: number) => Number.isFinite(cents) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100) : "Não informado";
export const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "Não informado";
export function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function webhookUrl(gateway: Gateway, base: string) {
  const provided = safeHttpsUrl(gateway.webhookUrl);
  if (provided) return provided;
  return /^\/webhooks\/[a-z-]+$/.test(gateway.webhookPath) ? safeHttpsUrl(`${base}${gateway.webhookPath}`) : null;
}
export function gatewayPatch(gateway: Gateway, values: { environment: Gateway["environment"]; credentials: string; webhookSecret: string; recurringCredentials: string; recurringEnabled: boolean }) {
  const changed = gateway.environment !== values.environment;
  const recurringRequired = gateway.gateway === "PAGBANK" && values.recurringEnabled;
  if (changed && (!values.credentials || (gateway.gateway === "PAGBANK" ? recurringRequired && !values.recurringCredentials : !values.webhookSecret))) {
    throw new Error(gateway.gateway === "PAGBANK" && !values.recurringEnabled
      ? "Informe o token de checkout para trocar o ambiente. A API bloqueia a troca quando existe histórico financeiro."
      : "Ao trocar de ambiente, substitua as credenciais necessárias para as capacidades habilitadas. A API bloqueia a troca quando existe histórico financeiro.");
  }
  return {
    environment: values.environment,
    ...(values.credentials ? { credentials: values.credentials } : {}),
    ...(gateway.gateway !== "PAGBANK" && values.webhookSecret ? { webhookSecret: values.webhookSecret } : {}),
    ...(gateway.gateway === "PAGBANK" ? {
      ...(values.recurringCredentials ? { recurringCredentials: values.recurringCredentials } : {}),
      ...(changed && !values.recurringEnabled ? { recurringCredentials: null } : {}),
      ...(values.recurringEnabled !== gateway.capabilities.recurring ? { recurringEnabled: values.recurringEnabled } : {}),
    } : {}),
  };
}
export function refundLabel(amountCents: number, refundedAmountCents: number) {
  return refundedAmountCents === 0 ? "Sem estorno" : refundedAmountCents < amountCents ? "Estorno parcial" : "Estorno total";
}
