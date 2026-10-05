import { api, jsonBody } from "./api";

// Contracts checked against kalend-api develop: communication module, services and Prisma schema.
export type ProviderName = "SMTP" | "META" | "EVOLUTION" | "GMAIL" | "PUSH_PENDING";
export type Channel = "EMAIL" | "WHATSAPP" | "PUSH";
export type Environment = "SANDBOX" | "PRODUCTION";
export interface CommunicationProvider {
  provider: ProviderName; scope: "GLOBAL"; environment: Environment; enabled: boolean;
  config: Record<string, string>; configured: boolean; status: string; revision: number;
  adapterAvailable: boolean; lastVerifiedAt: string | null; lastSentAt: string | null; lastError: string | null;
}
export interface CommunicationEvent { event: string; variables: string[] }
export interface InternalTemplate {
  id: string; event: string; channel: Channel; provider: ProviderName; enabled: boolean;
  content: Record<string, string>; revision: number;
  approvalStatus?: string | null; metaStatus?: string | null; metaTemplateId?: string | null;
  metaSubmissionState?: string | null; metaSubmittedName?: string | null;
  metaSubmittedAt?: string | null; metaSyncedAt?: string | null; metaStatusAt?: string | null;
  metaRejectionReason?: string | null;
}
export interface MetaTemplate {
  id: string; externalId: string; name: string; language: string; category: string; status: string;
  components: { type: string; text?: string; format?: string }[]; syncedAt: string;
}
export interface Outbox {
  id: string; event: string; expandedAt: string | null; lastError: string | null; createdAt: string;
}
export interface Delivery {
  id: string; outboxId: string; channel: Channel; provider: ProviderName; environment: Environment;
  recipientMasked: string; status: string; attempts: number; nextAttemptAt: string; lastError: string | null; createdAt: string;
}
export interface CommunicationLog {
  id: string; deliveryId: string | null; outboxId: string | null; action: string;
  code: string | null; attempt: number | null; createdAt: string;
}
export const providerNames: Record<ProviderName, string> = {
  SMTP: "E-mail SMTP", META: "WhatsApp — Meta Cloud API", EVOLUTION: "WhatsApp — Evolution API", GMAIL: "Gmail", PUSH_PENDING: "Push Web",
};
export const channelNames: Record<Channel, string> = { EMAIL: "E-mail", WHATSAPP: "WhatsApp", PUSH: "Push Web" };
export const providerChannels: Record<ProviderName, Channel> = { SMTP: "EMAIL", GMAIL: "EMAIL", META: "WHATSAPP", EVOLUTION: "WHATSAPP", PUSH_PENDING: "PUSH" };
const states: Record<string, string> = {
  NOT_CONFIGURED: "Não configurado", PENDING_VALIDATION: "Validação pendente", CONNECTED: "Conectado", FAILED: "Falha",
  PENDING: "Pendente", SENDING: "Enviando", ACCEPTED: "Aceito pelo provedor", DELIVERED: "Entregue", READ: "Lido", RETRY: "Aguardando nova tentativa",
  UNSENDABLE: "Não enviável", UNCERTAIN: "Resultado incerto", SKIPPED: "Ignorado", APPROVED: "Aprovado", REJECTED: "Rejeitado",
};
export const stateLabel = (state: string) => states[state] ?? state;
export function providerState(row?: CommunicationProvider) {
  if (!row) return "Estado não retornado pela API";
  if (row.provider === "GMAIL") return "Em breve · OAuth ainda não configurado";

  return stateLabel(row.status);
}
export const availableProvider = (p: ProviderName) => p !== "GMAIL";
export const providerFields: Record<ProviderName, [string, string][]> = {
  SMTP: [["host", "Host"], ["username", "Usuário"], ["fromName", "Nome do remetente"], ["fromEmail", "E-mail do remetente"], ["replyTo", "Responder para (opcional)"]],
  META: [["phoneNumberId", "ID do número de telefone"], ["businessAccountId", "ID da conta empresarial"], ["graphVersion", "Versão Graph autorizada no backend"]],
  EVOLUTION: [["baseUrl", "URL base HTTPS"], ["instance", "Instância"], ["version", "Versão (2.3.7)"]], GMAIL: [], PUSH_PENDING: [["subject", "Contato VAPID (mailto:email)"], ["publicKey", "Chave pública VAPID"]],
};
export const secretFields: Record<ProviderName, [string, string][]> = {
  SMTP: [["password", "Nova senha SMTP"]], META: [["accessToken", "Novo access token"], ["appSecret", "Novo app secret"], ["verifyToken", "Novo verify token"]],
  EVOLUTION: [["apiKey", "Nova API key"]], GMAIL: [], PUSH_PENDING: [["privateKey", "Nova chave privada VAPID (somente escrita)"]],
};
export function providerPatch(provider: ProviderName, config: Record<string, string>, secrets: Record<string, string>, environment: Environment) {
  const cleanConfig = Object.fromEntries([...providerFields[provider].map(([key]) => key), ...(provider === "SMTP" ? ["port", "secure"] : [])].map(key => [key, config[key] ?? ""]));
  if (provider === "SMTP" && !cleanConfig.replyTo.trim()) delete cleanConfig.replyTo;
  if (provider === "SMTP" && cleanConfig.host.trim().toLowerCase() === "smtp.gmail.com") throw new Error("Gmail exige OAuth. Este host não é permitido no SMTP.");
  const cleanSecrets = Object.fromEntries(secretFields[provider].filter(([key]) => !!secrets[key]).map(([key]) => [key, secrets[key]]));
  return { config: cleanConfig, environment, ...(Object.keys(cleanSecrets).length ? { secrets: cleanSecrets } : {}) };
}
export function safeQr(value: unknown) { return typeof value === "string" && value.length <= 200000 && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value) ? value : null; }
export function canReprocess(row: Delivery) { return row.status === "RETRY" && row.attempts < 5; }
export function previewText(text: string, variables: string[]) {
  return text.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => variables.includes(key) ? `[${key}]` : match);
}
export function metaParameters(content: Record<string, string>): string[] {
  try { const parsed: unknown = JSON.parse(content.metaParameters || "[]"); return Array.isArray(parsed) && parsed.every(item => typeof item === "string") ? parsed : []; } catch { return []; }
}
export type MetaReference = { id: string; name: string; language: string; parameters: string[] };
export type TemplatePatch = { provider: ProviderName; enabled: boolean; content: { text: string; subject?: string; title?: string; url?: string; icon?: string; actionText?: string; name?: string; language?: string; category?: string; examples?: Record<string, string> } | MetaReference };
export const communication = {
  providers: (signal?: AbortSignal) => api<CommunicationProvider[]>("/communication/providers", { signal }),
  events: (signal?: AbortSignal) => api<CommunicationEvent[]>("/communication/events", { signal }),
  templates: (signal?: AbortSignal) => api<InternalTemplate[]>("/communication/templates", { signal }),
  metaTemplates: (signal?: AbortSignal) => api<MetaTemplate[]>("/communication/meta/templates", { signal }),
  outbox: (signal?: AbortSignal) => api<Outbox[]>("/communication/outbox", { signal }),
  deliveries: (signal?: AbortSignal) => api<Delivery[]>("/communication/deliveries", { signal }),
  failures: (signal?: AbortSignal) => api<Delivery[]>("/communication/failures", { signal }),
  logs: (signal?: AbortSignal) => api<CommunicationLog[]>("/communication/logs", { signal }),
  patchProvider: (p: ProviderName, body: ReturnType<typeof providerPatch> | { enabled: boolean }) => api<CommunicationProvider>(`/communication/providers/${p}`, { method: "PATCH", ...jsonBody(body) }),
  test: (p: ProviderName) => api<{ connected: boolean; sendTested: false }>(`/communication/providers/${p}/test`, { method: "POST" }),
  sendTest: (p: ProviderName, template?: MetaReference) => api<{ accepted: boolean; delivered: false }>(`/communication/providers/${p}/send-test`, { method: "POST", ...jsonBody(template ? { template } : {}) }),
  pair: () => api<{ connected: true } | { connected: false; qrCode: string }>("/communication/providers/EVOLUTION/pair", { method: "POST" }),
  saveTemplate: (event: string, channel: Channel, body: TemplatePatch) => api<InternalTemplate>(`/communication/templates/${encodeURIComponent(event)}/${channel}`, { method: "PATCH", ...jsonBody(body) }),
  syncMeta: (after?: string) => api<{ synced: number; after: string | null }>("/communication/meta/templates/sync", { method: "POST", ...jsonBody(after ? { after } : {}) }),
  createMeta: (templateId: string) => api<{ template: InternalTemplate; alreadySubmitted: boolean; syncRequired: true }>("/communication/meta/templates", { method: "POST", ...jsonBody({ templateId }) }),
  reprocess: (id: string) => api<{ queued: true }>(`/communication/deliveries/${encodeURIComponent(id)}/reprocess`, { method: "POST" }),
};
