"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import type { AuthMe } from "@/lib/contracts";
import { unreadBadge } from "@/lib/notifications";
import { useNotificationCount, useNotificationList } from "./use-notifications";
import { NotificationList } from "./notification-list";
import { Drawer } from "./ui/drawer";
import { IconButton } from "./ui/icon-button";
import { Button } from "./ui/button";
import { Loading } from "./ui/loading";
import { Alert } from "./ui/alert";
export function NotificationBell({ profile }: { profile: AuthMe }) {
  const [open, setOpen] = useState(false);
  const count = useNotificationCount(profile);
  const list = useNotificationList(profile, "all", 6, open);
  const unread = count.data?.unreadCount;
  return <>
    <IconButton className="k-notification-bell" aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"} title="Notificações" aria-expanded={open} aria-controls={open ? "notification-panel" : undefined} onClick={event => { event.currentTarget.focus(); setOpen(true); void count.refresh(); }}><Bell size={20} aria-hidden="true" />{unread !== undefined && unread > 0 && <span className="k-notification-badge" aria-hidden="true">{unreadBadge(unread)}</span>}</IconButton>
    <Drawer id="notification-panel" open={open} label="Notificações" closeLabel="Fechar notificações" onClose={() => setOpen(false)}>
      <div className="k-notification-panel">
        <p aria-live="polite">{count.error || (unread === undefined ? "Consultando notificações…" : `${unread} ${unread === 1 ? "não lida" : "não lidas"}`)}</p>
        {count.error && <Button variant="secondary" onClick={() => void count.refresh()}>Tentar novamente a contagem</Button>}
        {list.error && <Alert tone="danger">{list.error}</Alert>}{list.success && <Alert>{list.success}</Alert>}
        {list.loading ? <Loading>Carregando notificações…</Loading> : list.data && <NotificationList items={list.data.items} saving={list.saving} read={list.read} onNavigate={() => setOpen(false)} />}
        {list.error && <Button variant="secondary" onClick={() => void list.refresh()}>Tentar novamente</Button>}
        <div className="k-notification-actions">{!!unread && <Button loading={list.saving} disabled={list.loading} variant="secondary" onClick={() => void list.read()}>Marcar todas como lidas</Button>}
          <Link className="k-link-button" href="/conta/notificacoes" onClick={() => setOpen(false)}>Ver todas</Link>
          <Link href="/conta/notificacoes#preferencias" onClick={() => setOpen(false)}><Settings size={16} aria-hidden="true" />Preferências de notificações</Link>
        </div>
      </div>
    </Drawer>
  </>;
}
