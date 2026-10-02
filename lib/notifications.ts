import { api, jsonBody, withTenantLock } from "./api";
import type { AuthMe } from "./contracts";
export type NotificationFilter = "all" | "unread" | "read";
export type InboxNotification = {
  id: string; type: string; title: string; message: string;
  createdAt: string; expiresAt: string; readAt: string | null;
  scope: "GLOBAL" | "COMPANY"; companyId: string | null; company: { name: string } | null;
  actionUrl: string | null; actionLabel: string | null;
};
export type NotificationPage = { items: InboxNotification[]; nextCursor: string | null; serverNow: string; companyId: string | null };
export type NotificationCount = { unreadCount: number; serverNow: string; companyId: string | null };
export type NotificationPreferences = { inSystemEnabled: boolean };
export const NOTIFICATIONS_CHANGED = "kalend:notifications-changed";
export function safeNotificationUrl(value: unknown): string | null {
  return typeof value === "string" && ["/conta", "/conta#perfil", "/conta#seguranca", "/conta#preferencias", "/conta/notificacoes"].includes(value) ? value : null;
}
export function notificationType(type: string) {
  return ({ sistema: "Sistema", pagamento: "Pagamento", assinatura: "Assinatura", agendamento: "Agendamento", comunicacao: "Comunicação", seguranca: "Segurança", empresa: "Empresa", atualizacao: "Atualização" } as Record<string, string>)[type] ?? "Notificação";
}
export function unreadBadge(count: number) { return count > 99 ? "99+" : String(Math.max(0, count)); }
export function notificationsChanged() { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); }
export async function notificationContext<T>(profile: AuthMe, work: () => Promise<T>): Promise<T> {
  return withTenantLock(async () => {
    const current = await api<AuthMe>("/auth/me");
    if (current.user.id !== profile.user.id || current.selectedCompanyId !== profile.selectedCompanyId) throw new Error("A sessão ou empresa mudou. Atualize a página.");
    return work();
  });
}
export function notificationsApi(profile: AuthMe) {
  async function scoped<T extends { companyId: string | null }>(work: () => Promise<T>) {
    const value = await notificationContext(profile, work);
    if (value.companyId !== profile.selectedCompanyId) throw new Error("A empresa mudou. Atualize a página.");
    return value;
  }
  return {
    count: () => scoped(() => api<NotificationCount>("/notifications/unread-count")),
    list: (filter: NotificationFilter, limit = 20, cursor: string | null = null) => {
      const query = new URLSearchParams({ filter, limit: String(limit) });
      if (cursor) query.set("cursor", cursor);
      return scoped(() => api<NotificationPage>(`/notifications?${query}`));
    },
    read: (id?: string) => scoped(() => api<{ updated: number; serverNow: string; companyId: string | null }>(id ? `/notifications/${encodeURIComponent(id)}/read` : "/notifications/read-all", { method: "POST", ...jsonBody({}) })),
    preferences: () => notificationContext(profile, () => api<NotificationPreferences>("/notifications/preferences")),
    setPreferences: (inSystemEnabled: boolean) => notificationContext(profile, () => api<NotificationPreferences>("/notifications/preferences", { method: "PUT", ...jsonBody({ inSystemEnabled }) })),
  };
}
