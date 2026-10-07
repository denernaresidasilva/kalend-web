import { api, tenantApi, jsonBody } from './api';
export type EvolutionContext = { companyId: string; userId: string; scope?: 'COMPANY' } | { scope: 'GLOBAL'; userId: string };
export type EvolutionStatus = 'PENDING' | 'CREATED' | 'DELETING' | 'CREATING' | 'QR_AVAILABLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type EvolutionConnection = {
  status: EvolutionStatus; phone: string | null; profileName: string | null; connectedAt: string | null;
  qrCode: string | null; qrExpiresAt: string | null; pairingCode: string | null; pairingExpiresAt: string | null;
  pairingSupported: boolean; errorCode: string | null; message: string | null;
  attemptExpiresAt: string | null; disconnectReason: number | null; operationPending: boolean;
};
export const evolutionLabels: Record<EvolutionStatus, string> = {
  CREATED: '🟡 Conexão preparada', DELETING: 'Excluindo conexão...', PENDING: '🟡 Aguardando conexão', CREATING: '🟡 Preparando conexão', QR_AVAILABLE: '🟡 Aguardando conexão',
  CONNECTING: '🟡 Conectando...', CONNECTED: '🟢 WhatsApp conectado', DISCONNECTED: '🔴 WhatsApp desconectado', ERROR: '🔴 Conexão indisponível',
};
const companyBase = '/company/communication/evolution';
async function request<T = EvolutionConnection>(ctx: EvolutionContext, path: string, init: RequestInit) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) abort();
  // First preparation can make five sequential provider requests, each bounded at 15s.
  // Reconciliation may read state and profile (2 × 15s), plus DNS/auth overhead.
  const timer = setTimeout(abort, init.method ? 90000 : 40000);
  try {
    const bounded = { ...init, signal: controller.signal };
    if (ctx.scope !== 'GLOBAL') return await tenantApi<T>(ctx.companyId, companyBase + path, bounded, ctx.userId);
    const identity = await api<{ user: { id: string }; systemRole: string }>('/auth/me', { signal: controller.signal });
    if (identity.user.id !== ctx.userId || identity.systemRole !== 'SUPER_ADMIN') throw new Error('A sessão mudou. Abra novamente a conexão.');
    return await api<T>('/communication/evolution' + path, bounded);
  } finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}
export function normalizeEvolutionPhone(value: string) {
  const phone = value.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('Informe um número válido com DDI.');
  return phone;
}

export const evolutionApi = {
  get: (ctx: EvolutionContext, signal?: AbortSignal) => request(ctx, '', { signal }),
  action: (ctx: EvolutionContext, action: 'prepare' | 'connect' | 'reconnect' | 'logout' | 'remove' | 'pairing-code', phone?: string, signal?: AbortSignal) =>
    request(ctx, action === 'remove' ? '' : `/${action}`, {
      method: action === 'remove' ? 'DELETE' : 'POST', ...jsonBody(action === 'pairing-code' ? { phone: normalizeEvolutionPhone(phone ?? '') } : {}), signal,
    }),
  sendTest: (ctx: EvolutionContext, signal?: AbortSignal) => {
    if (ctx.scope === 'GLOBAL') return Promise.reject(new Error('Use o teste do canal global.'));
    return request<{ accepted: boolean; delivered: boolean }>(ctx, '/send-test', { method: 'POST', ...jsonBody({}), signal });
  },
};
export function evolutionExpired(value: string | null, now = Date.now()) { return !!value && Date.parse(value) <= now; }

const errors: Record<string, string> = {
  EVOLUTION_AUTH_FAILED: 'A credencial da integração precisa ser verificada pela administração.',
  EVOLUTION_FORBIDDEN: 'A Evolution recusou a autorização da integração.',
  EVOLUTION_UNAVAILABLE: 'A Evolution está temporariamente indisponível. Aguarde e tente novamente.',
  EVOLUTION_TIMEOUT: 'A Evolution não respondeu no prazo. Atualize o estado antes de tentar novamente.',
  EVOLUTION_RATE_LIMITED: 'Muitas solicitações à Evolution. Aguarde e tente novamente.',
  EVOLUTION_BAD_REQUEST: 'A Evolution recusou a solicitação. A integração precisa ser verificada.',
  EVOLUTION_INVALID_RESPONSE: 'A Evolution retornou uma resposta inesperada.',
  EVOLUTION_WEBHOOK_BASE_URL_REQUIRED: 'A URL do webhook precisa ser configurada pela administração.',
  EVOLUTION_WEBHOOK_BASE_URL_INVALID: 'A URL do webhook precisa ser verificada pela administração.',
  EVOLUTION_ENVIRONMENT_MISMATCH: 'O ambiente da integração precisa ser verificado pela administração.',
  CONNECTION_NOT_FOUND: 'A instância não existe mais. Configure a conexão novamente.',
  CONNECTION_FAILED: 'Não foi possível iniciar esta conexão. Tente novamente.',
  OPERATION_IN_PROGRESS: 'Uma operação está em andamento. Aguarde a atualização do estado.',
  QR_UNAVAILABLE: 'Aguardando o QR Code da Evolution.',
  PAIRING_CODE_UNAVAILABLE: 'Aguardando o código de conexão. Você também pode usar o QR Code.',
  CODE_EXPIRED: 'Este código expirou. Solicite um novo código.',
  CONNECTION_TIMEOUT: 'A tentativa expirou. Solicite uma nova conexão.',
  WHATSAPP_LOGGED_OUT: 'O WhatsApp encerrou ou revogou a sessão. Conecte novamente.',
  WHATSAPP_CONNECTION_CLOSED: 'A conexão com o WhatsApp foi encerrada.',
  INVALID_PHONE: 'Informe um número válido com DDI.',
  CONNECTION_NOT_OPEN: 'O WhatsApp precisa estar conectado para enviar mensagens.',
  INTEGRATION_STATE_UNAVAILABLE: 'O estado da integração está temporariamente indisponível. Aguarde e tente novamente.',
  INTEGRATION_BUSY: 'Uma operação está em andamento. Aguarde antes de enviar a mensagem.',
  MESSAGE_ACCEPTANCE_UNKNOWN: 'Não foi possível confirmar a aceitação da mensagem. Verifique o envio antes de tentar novamente.',
  TEST_RECIPIENT_UNAVAILABLE: 'Informe seu telefone no perfil para receber a mensagem de teste.',
};
export function evolutionErrorMessage(value: unknown) {
  const code = typeof value === 'string' ? value : value && typeof value === 'object' && 'errorCode' in value ? String(value.errorCode) : '';
  return errors[code] ?? 'Não foi possível atualizar a conexão. Aguarde e tente novamente.';
}
