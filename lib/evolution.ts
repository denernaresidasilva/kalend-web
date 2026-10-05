import { api, tenantApi, jsonBody } from './api';
export type EvolutionContext = { companyId: string; userId: string; scope?: 'COMPANY' } | { scope: 'GLOBAL'; userId: string };
export type EvolutionStatus = 'PENDING' | 'CREATED' | 'DELETING' | 'CREATING' | 'QR_AVAILABLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type EvolutionConnection = {
  status: EvolutionStatus; phone: string | null; profileName: string | null; connectedAt: string | null;
  qrCode: string | null; qrExpiresAt: string | null; pairingCode: string | null; pairingExpiresAt: string | null;
  pairingSupported: boolean; errorCode: string | null; message: string | null;
};
export const evolutionLabels: Record<EvolutionStatus, string> = {
  CREATED: '🟡 Conexão preparada', DELETING: 'Excluindo conexão...', PENDING: '🟡 Aguardando conexão', CREATING: '🟡 Preparando conexão', QR_AVAILABLE: '🟡 Aguardando conexão',
  CONNECTING: '🟡 Conectando...', CONNECTED: '🟢 WhatsApp conectado', DISCONNECTED: '🔴 WhatsApp desconectado', ERROR: '🔴 Conexão indisponível',
};
const companyBase = '/company/communication/evolution';
async function request(ctx: EvolutionContext, path: string, init: RequestInit) {
  if (ctx.scope !== 'GLOBAL') return tenantApi<EvolutionConnection>(ctx.companyId, companyBase + path, init, ctx.userId);
  const identity = await api<{ user: { id: string }; systemRole: string }>('/auth/me', { signal: init.signal });
  if (identity.user.id !== ctx.userId || identity.systemRole !== 'SUPER_ADMIN') throw new Error('A sessão mudou. Abra novamente a conexão.');
  return api<EvolutionConnection>('/communication/evolution' + path, init);
}
export function normalizeEvolutionPhone(value: string) {
  const phone = value.trim().replace(/[ ()-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(phone)) throw new Error('Informe um número válido com DDI.');
  return phone.replace(/^\+/, '');
}

export const evolutionApi = {
  get: (ctx: EvolutionContext, signal?: AbortSignal) => request(ctx, '', { signal }),
  action: (ctx: EvolutionContext, action: 'prepare' | 'connect' | 'reconnect' | 'logout' | 'remove' | 'pairing-code', phone?: string, signal?: AbortSignal) =>
    request(ctx, action === 'remove' ? '' : `/${action}`, {
      method: action === 'remove' ? 'DELETE' : 'POST', ...jsonBody(action === 'pairing-code' ? { phone: normalizeEvolutionPhone(phone ?? '') } : {}), signal,
    }),
};
export function evolutionExpired(value: string | null, now = Date.now()) { return !!value && Date.parse(value) <= now; }
