"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthMe } from "@/lib/contracts";
import { NOTIFICATIONS_CHANGED, notificationsApi, notificationsChanged, type NotificationFilter, type NotificationPage, type NotificationCount } from "@/lib/notifications";

export function useNotificationCount(profile: AuthMe) {
  const service = useMemo(() => notificationsApi(profile), [profile]);
  const [data, setData] = useState<NotificationCount | null>(null);
  const [error, setError] = useState("");
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    try { const result = await service.count(); if (current === version.current) { setData(result); setError(""); } }
    catch { if (current === version.current) { setData(null); setError("Não foi possível carregar suas notificações."); } }
  }, [service]);
  useEffect(() => {
    const generation = version;
    const current = ++generation.current;
    service.count().then(result => { if (current === generation.current) { setData(result); setError(""); } }).catch(() => { if (current === generation.current) { setData(null); setError("Não foi possível carregar suas notificações."); } });
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const push = (event: MessageEvent) => { if (event.data?.type === "KALEND_NOTIFICATION_RECEIVED") void refresh(); };
    const timer = window.setInterval(visible, 60000);
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    window.addEventListener(NOTIFICATIONS_CHANGED, visible); navigator.serviceWorker?.addEventListener("message", push);
    return () => { generation.current++; window.clearInterval(timer); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); window.removeEventListener(NOTIFICATIONS_CHANGED, visible); navigator.serviceWorker?.removeEventListener("message", push); };
  }, [refresh, service]);
  return { data, error, refresh };
}
export function useNotificationList(profile: AuthMe, filter: NotificationFilter, limit: number, enabled = true) {
  const service = useMemo(() => notificationsApi(profile), [profile]);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedFilter, setLoadedFilter] = useState<NotificationFilter | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const version = useRef(0); const mutation = useRef(false);
  const refresh = useCallback(async (cursor: string | null = null) => {
    const current = ++version.current; setLoading(true); setError("");
    try { const result = await service.list(filter, limit, cursor); if (version.current === current) setData(previous => ({ ...result, items: cursor ? [...(previous?.items ?? []), ...result.items] : result.items })); }
    catch { if (version.current === current) { setData(null); setError("Não foi possível carregar suas notificações."); } }
    finally { if (version.current === current) { setLoading(false); setLoadedFilter(filter); } }
  }, [service, filter, limit]);
  useEffect(() => {
    const generation = version;
    const current = ++generation.current;
    if (enabled) service.list(filter, limit).then(result => {
      if (current === generation.current) { setData(result); setError(""); setLoading(false); setLoadedFilter(filter); }
    }).catch(() => { if (current === generation.current) { setData(null); setError("Não foi possível carregar suas notificações."); setLoading(false); setLoadedFilter(filter); } });
    const changed = () => { if (enabled && document.visibilityState === "visible" && !mutation.current) void refresh(); };
    const push = (event: MessageEvent) => { if (event.data?.type === "KALEND_NOTIFICATION_RECEIVED") changed(); };
    window.addEventListener("focus", changed); window.addEventListener(NOTIFICATIONS_CHANGED, changed);
    document.addEventListener("visibilitychange", changed); navigator.serviceWorker?.addEventListener("message", push);
    return () => { generation.current++; window.removeEventListener("focus", changed); window.removeEventListener(NOTIFICATIONS_CHANGED, changed); document.removeEventListener("visibilitychange", changed); navigator.serviceWorker?.removeEventListener("message", push); };
  }, [service, filter, limit, enabled, refresh]);
  async function read(id?: string): Promise<boolean> {
    if (mutation.current) return false;
    mutation.current = true; setSaving(true); setError(""); setSuccess(""); const current = version.current;
    try {
      await service.read(id);
      if (current !== version.current) return false;
      setSuccess(id ? "Notificação marcada como lida." : "Notificações marcadas como lidas.");
      notificationsChanged(); await refresh(); return true;
    } catch { if (current === version.current) setError("Não foi possível marcar as notificações como lidas. Tente novamente."); return false; }
    finally { mutation.current = false; setSaving(false); }
  }
  return { data, loading: loading || loadedFilter !== filter, saving, error, success, refresh, read };
}
