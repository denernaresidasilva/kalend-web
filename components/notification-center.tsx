"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthMe } from "@/lib/contracts";
import { notificationsApi, type NotificationPreferences, type NotificationFilter } from "@/lib/notifications";
import { useNotificationList } from "./use-notifications";
import { NotificationList } from "./notification-list";
import { PushSettings } from "./push-settings";
import { Card } from "./ui/card";
import { Loading } from "./ui/loading";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
function NotificationPreferencesPanel({ profile }: { profile: AuthMe }) {
  const service = useMemo(() => notificationsApi(profile), [profile]);
  const [data, setData] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [saving, setSaving] = useState(false);
  const mounted = useRef(false); const flight = useRef(false);
  async function load() {
    try { const result = await service.preferences(); if (mounted.current) { setData(result); setError(""); } }
    catch { if (mounted.current) setError("Não foi possível carregar suas preferências."); }
  }
  useEffect(() => {
    let active = true; mounted.current = true;
    service.preferences().then(result => { if (active) setData(result); }).catch(() => { if (active) setError("Não foi possível carregar suas preferências."); });
    return () => { active = false; mounted.current = false; };
  }, [service]);
  async function toggle() {
    if (!data || flight.current) return;
    flight.current = true; setSaving(true); setError(""); setSuccess("");
    try { const result = await service.setPreferences(!data.inSystemEnabled); if (mounted.current) { setData(result); setSuccess("Preferências atualizadas com sucesso."); } }
    catch { if (mounted.current) setError("Não foi possível atualizar suas preferências."); }
    finally { flight.current = false; if (mounted.current) setSaving(false); }
  }
  return <section id="preferencias" className="k-account-stack" aria-labelledby="notification-preferences-title">
    <Card><h2 id="notification-preferences-title">Preferências de notificações</h2><p>Notificações no sistema e Push Web são independentes. O histórico fica disponível por 7 dias após sua criação na central.</p>
      <p>Desativar as notificações no sistema impede a criação de novas notificações para sua conta. O histórico existente permanece até expirar. Esta preferência vale para todas as suas empresas.</p>
      {data ? <><p>Notificações no sistema: <strong>{data.inSystemEnabled ? "Ativadas" : "Desativadas"}</strong></p><Button loading={saving} variant={data.inSystemEnabled ? "secondary" : "primary"} onClick={() => void toggle()}>{data.inSystemEnabled ? "Desativar notificações no sistema" : "Ativar notificações no sistema"}</Button></> : !error && <Loading>Carregando preferências…</Loading>}
      {error && <><Alert tone="danger">{error}</Alert>{!data && <Button variant="secondary" onClick={() => void load()}>Tentar novamente</Button>}</>}{success && <Alert>{success}</Alert>}
    </Card>
    {profile.selectedCompanyId || profile.systemRole === "SUPER_ADMIN" ? <PushSettings /> : <Card><h2>Push Web</h2><p>Selecione uma empresa no Perfil para configurar as notificações deste navegador.</p><a href="/conta#perfil">Abrir perfil</a></Card>}
  </section>;
}
export function NotificationCenter({ profile }: { profile: AuthMe }) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const list = useNotificationList(profile, filter, 20);
  return <div className="k-account-stack">
    <Card><p>{profile.selectedCompanyId ? `Notificações globais e da empresa selecionada: ${profile.memberships.find(m => m.company.id === profile.selectedCompanyId)?.company.name ?? "empresa selecionada"}.` : "Notificações globais da sua conta. Nenhuma empresa selecionada."}</p>
      <div className="k-notification-toolbar"><div className="k-notification-filters" role="group" aria-label="Filtrar notificações">{([['all', 'Todas'], ['unread', 'Não lidas'], ['read', 'Lidas']] as const).map(([value, label]) => <Button key={value} variant={value === filter ? "primary" : "secondary"} aria-pressed={filter === value} disabled={list.saving} onClick={() => setFilter(value)}>{label}</Button>)}</div>
        <Button variant="secondary" loading={list.saving} disabled={list.loading} onClick={() => void list.read()}>Marcar todas como lidas</Button><Button variant="ghost" disabled={list.loading || list.saving} onClick={() => void list.refresh()}>Atualizar</Button><a href="#preferencias">Preferências de notificações</a>
      </div>
      {list.error && <Alert tone="danger">{list.error}</Alert>}{list.success && <Alert>{list.success}</Alert>}
      {list.loading ? <Loading>Carregando notificações…</Loading> : list.data && <NotificationList items={list.data.items} saving={list.saving} read={list.read} />}
      {list.error && <Button variant="secondary" onClick={() => void list.refresh()}>Tentar novamente</Button>}
      {list.data?.nextCursor && <Button variant="secondary" disabled={list.loading || list.saving} onClick={() => void list.refresh(list.data!.nextCursor)}>Carregar mais</Button>}
    </Card>
    <NotificationPreferencesPanel profile={profile} />
  </div>;
}
