import { api, jsonBody, tenantApi } from './api';
export const emailProviders = {
  GOOGLE: { name: 'Google / Gmail', host: 'smtp.gmail.com', port: 587, security: 'TLS' },
  MICROSOFT: { name: 'Microsoft / Outlook / Hotmail', host: 'smtp-mail.outlook.com', port: 587, security: 'TLS' },
  ICLOUD: { name: 'iCloud', host: 'smtp.mail.me.com', port: 587, security: 'TLS' },
  CUSTOM: { name: 'Outro SMTP', host: '', port: 587, security: 'TLS' },
} as const;
export type EmailProvider = keyof typeof emailProviders;
export type EmailScope = 'SYSTEM' | 'COMPANY';
export type EmailContext = { scope: 'SYSTEM' } | { scope: 'COMPANY'; companyId: string; userId: string };
export type EmailConfiguration = {
  scope: EmailScope; configured: boolean; provider: EmailProvider; email: string; username: string;
  smtpHost: string; smtpPort: number; security: 'TLS' | 'SSL'; enabled: boolean; verified: boolean;
  status: 'NOT_CONFIGURED' | 'UNTESTED' | 'VERIFIED' | 'ERROR';
  lastTestAt: string | null; lastTestRecipient: string | null; lastTestStatus: 'SUCCESS' | 'ERROR' | null;
};
export type EmailInput = Pick<EmailConfiguration, 'provider' | 'email' | 'smtpHost' | 'smtpPort' | 'security'> & { username?: string; password?: string; enabled?: boolean };
export type EmailTest = { sent: boolean; recipient: string; server: string; tls: boolean; code: string | null; message: string; configuration: EmailConfiguration };
export const emailStatuses = { NOT_CONFIGURED: 'Não configurado', UNTESTED: 'Configurado, não testado', VERIFIED: 'Testado com sucesso', ERROR: 'Erro no último teste' };
const base = (scope: EmailScope) => scope === 'SYSTEM' ? '/communication/email' : '/company/communication/email';
function request<T>(context: EmailContext, path: string, init?: RequestInit) {
  if (context.scope === 'SYSTEM') return api<T>(path, init);
  if (!context.companyId || !context.userId) return Promise.reject(new Error('Selecione uma empresa e uma sessão válidas.'));
  return tenantApi<T>(context.companyId, path, init, context.userId);
}
export const emailApi = {
  get: (context: EmailContext, signal?: AbortSignal) => request<EmailConfiguration>(context, base(context.scope), { signal }),
  save: (context: EmailContext, body: EmailInput) => request<EmailConfiguration>(context, base(context.scope), { method: 'PUT', ...jsonBody(body) }),
  remove: (context: EmailContext) => request<EmailConfiguration>(context, base(context.scope), { method: 'DELETE' }),
  test: (context: EmailContext, recipient: string) => request<EmailTest>(context, `${base(context.scope)}/test`, { method: 'POST', ...jsonBody({ recipient }) }),
};
