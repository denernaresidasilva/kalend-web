"use client";
import {GiftCardsPanel} from "./gift-cards-panel";
import { ClientSubscriptionsPanel } from "./client-subscriptions-panel";
import { ClientPackages } from "./packages-panel";
import { ClientWaitlist } from "./waitlist-panel";
import { LoyaltyPanel } from "./loyalty-panel";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { tenantApi } from "@/lib/api";
import { CustomerMessageConsent } from "./automations-panel";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
type Booking = { id: string; status: string; items: Array<{ id: string; serviceName: string; startsAt: string; priceCents: number; professional: { displayName: string } }> };
const labels: Record<string, string> = { REQUESTED: "Aguardando confirmação", CONFIRMED: "Confirmado", REJECTED: "Recusado", CANCELLED: "Cancelado", EXPIRED: "Expirado" };
export function ClientBookings() {
  const { profile } = useAuth();
  const companyId = profile?.selectedCompanyId ?? "", userId = profile?.user.id ?? "";
  const [state, setState] = useState<{ key: string; items?: Booking[]; timezone?: string; error?: string } | null>(null);
  const key = `${userId}:${companyId}`;
  const slug=profile?.memberships.find(m=>m.company.id===companyId)?.company.slug;
  useEffect(() => {
    if (!companyId || !userId) return;
    let live = true;
    async function load() {
      try { const data = await tenantApi<{ requests: Booking[]; timezone: string }>(companyId, "/booking/my-requests", undefined, userId); if (live) setState({ key, items: data.requests, timezone: data.timezone }); }
      catch (cause) { if (live) setState({ key, error: cause instanceof Error ? cause.message : "Não foi possível carregar seus agendamentos." }); }
    }
    void load(); const timer = window.setInterval(() => void load(), 15000);
    return () => { live = false; window.clearInterval(timer); };
  }, [companyId, userId, key]);
  const current = state?.key === key ? state : null;
  return <section id="agenda" className="k-ops-page"><header><h1>Meus agendamentos</h1><p>Acompanhe os pedidos feitos neste estabelecimento.</p></header>{slug&&<ClientWaitlist slug={slug}/>}<CustomerMessageConsent companyId={companyId} userId={userId} /><LoyaltyPanel companyId={companyId} userId={userId} /><ClientSubscriptionsPanel companyId={companyId} userId={userId} own/><GiftCardsPanel companyId={companyId} userId={userId} own/><ClientPackages key={key} companyId={companyId} userId={userId}/>{current?.error && <Alert tone="danger">{current.error}</Alert>}{!current ? <p role="status">Carregando agendamentos…</p> : current.items?.length === 0 ? <Card><p>Você ainda não tem agendamentos neste estabelecimento.</p></Card> : current.items?.map(booking => <Card key={booking.id}><h2>Pedido {booking.id.slice(0, 8).toUpperCase()}</h2><p className="k-badge">{labels[booking.status] ?? booking.status}</p><ul className="k-agenda-list">{booking.items.map(item => <li key={item.id}><div><strong>{item.serviceName}</strong><p>{item.professional.displayName}</p><time dateTime={item.startsAt}>{new Intl.DateTimeFormat("pt-BR", { timeZone: current.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}</time><p>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.priceCents / 100)}</p></div></li>)}</ul></Card>)}</section>;
}
