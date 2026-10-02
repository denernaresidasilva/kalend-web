"use client";
import { useRouter } from "next/navigation";
import { Bell, Check, CreditCard, ShieldCheck, CalendarDays, Building2 } from "lucide-react";
import { notificationType, safeNotificationUrl, type InboxNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export function NotificationList({ items, saving, read, onNavigate }: { items: InboxNotification[]; saving: boolean; read: (id: string) => Promise<boolean>; onNavigate?: () => void }) {
  const router = useRouter();
  if (!items.length) return <div className="k-notification-empty"><Bell aria-hidden="true" /><h2>Você está em dia.</h2><p>Não há notificações neste filtro.</p></div>;
  return <ul className="k-notification-list">{items.map(item => {
    const Icon = ({ pagamento: CreditCard, assinatura: CreditCard, seguranca: ShieldCheck, agendamento: CalendarDays, empresa: Building2 } as Record<string, typeof Bell>)[item.type] ?? Bell;
    const action = safeNotificationUrl(item.actionUrl);
    return <li key={item.id} className={`k-notification-item ${!item.readAt ? "is-unread" : ""}`}>
      <Icon className="k-notification-type-icon" size={20} aria-hidden="true" />
      <div className="k-notification-content"><div className="k-notification-title"><strong>{item.title}</strong>{!item.readAt && <span className="k-unread-dot" aria-label="Não lida" />}</div>
        <p>{item.message}</p><span className="k-muted">{notificationType(item.type)} · {item.scope === "GLOBAL" ? "Global" : item.company?.name ?? "Empresa selecionada"}</span>
        <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
        <div className="k-notification-actions">{!item.readAt && <Button variant="ghost" disabled={saving} onClick={() => void read(item.id)} aria-label={`Marcar como lida: ${item.title}`}><Check size={16} aria-hidden="true" />Marcar como lida</Button>}
          {action && <Button variant="secondary" disabled={saving} onClick={async () => { if (!item.readAt && !(await read(item.id))) return; onNavigate?.(); router.push(action); }}>{item.actionLabel || "Abrir notificação"}</Button>}
        </div>
      </div>
    </li>;
  })}</ul>;
}
