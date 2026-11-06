"use client";
import { LoyaltyPanel } from "./loyalty-panel";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { jsonBody, tenantApi } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { WaitlistPanel } from "./waitlist-panel";
import { AutomationsPanel } from "./automations-panel";
import { FinancialReport } from "./financial-report";
import { CommissionsPanel } from "./commissions-panel";
import { OperationsBoard } from "./operations-board";
import { ServiceManagement } from "./service-management";
import { useBookingEvents } from "./use-booking-events";
import { TenantAgenda } from "./tenant-agenda";
import { Card } from "@/components/ui/card";

type Request = { id: string; status: string; createdAt: string; holdExpiresAt: string; customer: { id?: string; userId?: string | null; name: string; email?: string | null; phone?: string | null }; items: Array<{ id: string; serviceName: string; priceCents: number; startsAt: string; endsAt: string; professional: { displayName: string } }> };
type Service = { id: string; name: string; durationMinutes: number; priceCents: number; active: boolean };
type SetupResult = { service: Service; professional: { displayName: string } };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function TenantOperations({ setup = false }: { setup?: boolean }) {
  const { profile } = useAuth();
  return <TenantOperationsContent key={`${profile?.user.id}:${profile?.selectedCompanyId}`} setup={setup} />;
}

function TenantOperationsContent({ setup }: { setup: boolean }) {
  const { profile } = useAuth();
  const companyId = profile?.selectedCompanyId ?? "";
  const userId = profile?.user.id ?? "";
  const role = profile?.memberships.find((item) => item.company.id === companyId)?.role;
  const mayDecide = role === "OWNER" || role === "ADMIN" || role === "RECEPTIONIST";
  const maySetup = role === "OWNER" || role === "ADMIN";
  const [requests, setRequests] = useState<Request[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [agendaRevision, setAgendaRevision] = useState(0);
  const [invitation, setInvitation] = useState<{ url: string; name: string; expiresAt: string } | null>(null);
  const [notice, setNotice] = useState("");
  const observedRequests = useRef(false);
  const knownRequestIds = useRef(new Set<string>());

  const reload = useCallback(async (silent = false) => {
    if (!companyId || !userId) return;
    if (!silent) { setLoading(true); setError(""); }
    try {
      const [nextRequests, nextServices] = await Promise.all([
        tenantApi<Request[]>(companyId, "/booking/requests", undefined, userId),
        setup ? tenantApi<Service[]>(companyId, "/booking/services", undefined, userId) : Promise.resolve([] as Service[]),
      ]);
      if (observedRequests.current && nextRequests.some((request) => request.status === "REQUESTED" && !knownRequestIds.current.has(request.id))) setNotice("Nova solicitação de agendamento recebida.");
      knownRequestIds.current = new Set(nextRequests.map((request) => request.id)); observedRequests.current = true;
      setRequests(nextRequests); setServices(nextServices);
    } catch (cause) { if (!silent) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados."); }
    finally { if (!silent) setLoading(false); }
  }, [companyId, userId, setup]);
  useEffect(() => { queueMicrotask(() => void reload()); const timer = window.setInterval(() => void reload(true), 30_000); return () => window.clearInterval(timer); }, [reload]);

  const onBookingChange = useCallback(() => {
    void reload(true);
    setAgendaRevision(value => value + 1);
  }, [reload]);
  const liveConnected = useBookingEvents(companyId, userId, onBookingChange);

  const counts = useMemo(() => ({ pending: requests.filter((request) => request.status === "REQUESTED").length, confirmed: requests.filter((request) => request.status === "CONFIRMED").length }), [requests]);

  async function decide(requestId: string, action: "accept" | "reject") {
    setBusy(requestId); setError(""); setNotice("");
    try {
      await tenantApi(companyId, `/booking/requests/${requestId}/${action}`, { method: "POST", ...jsonBody({}) }, userId);
      setNotice(action === "accept" ? "Solicitação confirmada." : "Solicitação recusada.");
      setAgendaRevision((value) => value + 1);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível processar a solicitação."); }
    finally { setBusy(""); }
  }

  async function openOrder(requestId: string) {
    setBusy(requestId); setError("");
    try { await tenantApi(companyId, "/operations/sales", { method: "POST", ...jsonBody({ bookingRequestId: requestId, idempotencyKey: requestId }) }, userId); onBookingChange(); document.getElementById("pdv")?.scrollIntoView({ behavior: "smooth" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir a comanda."); }
    finally { setBusy(""); }
  }

  async function inviteCustomer(customer: Request["customer"]) {
    if (!customer.id) return;
    setBusy(customer.id); setError(""); setInvitation(null);
    try {
      const result = await tenantApi<{ token: string; expiresAt: string }>(companyId, `/booking/customers/${customer.id}/invitation`, { method: "POST", ...jsonBody({}) }, userId);
      setInvitation({ url: `${window.location.origin}/ativar-cliente#token=${encodeURIComponent(result.token)}`, name: customer.name, expiresAt: result.expiresAt });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gerar o convite."); }
    finally { setBusy(""); }
  }

  async function createFirstService(form: HTMLFormElement) {
    const data = new FormData(form);
    const days = data.getAll("weekday").map(Number);
    const startMinute = parseTime(String(data.get("startTime")));
    const endMinute = parseTime(String(data.get("endTime")));
    if (!days.length || startMinute >= endMinute) { setError("Escolha ao menos um dia e um intervalo válido."); return; }
    setBusy("setup"); setError(""); setNotice("");
    try {
      const result = await tenantApi<SetupResult>(companyId, "/booking/setup/first-service", { method: "POST", ...jsonBody({
        service: { name: data.get("serviceName"), description: data.get("description") || undefined, durationMinutes: Number(data.get("duration")), priceCents: Math.round(Number(data.get("price")) * 100) },
        professional: { membershipId: data.get("membershipId"), displayName: data.get("professionalName") },
        availability: days.map((weekday) => ({ weekday, startMinute, endMinute })),
      }) }, userId);
      setNotice(`Serviço “${result.service.name}” e disponibilidade de ${result.professional.displayName} configurados.`);
      form.reset(); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível configurar o serviço."); }
    finally { setBusy(""); }
  }

  if (!companyId) return <Card><p>Selecione uma empresa para abrir as operações.</p></Card>;
  return <div className="k-ops-page">
    <header className="k-page-heading"><div><p className="k-eyebrow">OPERAÇÃO DA EMPRESA</p><h1>{setup ? "Painel do proprietário" : "Solicitações de agendamento"}</h1><p>A agenda e os dados exibidos pertencem à empresa selecionada.</p></div><button className="k-button-secondary" onClick={() => void reload()} disabled={loading}>Atualizar</button></header>
    <p className="k-muted" role="status">{liveConnected ? "Atualizações em tempo real conectadas." : "Verificando novas solicitações automaticamente…"}</p>
    {error && <Alert tone="danger">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <section className="k-grid k-grid-3" aria-label="Resumo de solicitações"><Card><span>Solicitações pendentes</span><strong className="k-ops-metric">{counts.pending}</strong></Card><Card><span>Solicitações confirmadas</span><strong className="k-ops-metric">{counts.confirmed}</strong></Card>{setup && <Card><span>Serviços cadastrados</span><strong className="k-ops-metric">{services.filter((service) => service.active).length}</strong></Card>}</section>
    {setup && maySetup && !loading && services.length === 0 && <Card><h2>Configurar serviço e profissional</h2><p>Configure seu primeiro serviço e os dias disponíveis para agendamento.</p><form className="k-form-grid k-ops-form" onSubmit={(event) => { event.preventDefault(); void createFirstService(event.currentTarget); }}>
      <label>Nome do serviço<input name="serviceName" required maxLength={120} /></label><label>Descrição<input name="description" maxLength={2000} /></label><label>Duração (minutos)<input name="duration" type="number" min={1} max={1440} defaultValue={30} required /></label><label>Preço (R$)<input name="price" type="number" min={0} step="0.01" required /></label><label>Profissional da empresa<select name="membershipId" required defaultValue=""><option value="" disabled>Selecione um membro autorizado</option>{profile?.memberships.filter((membership) => membership.company.id === companyId && ["OWNER", "ADMIN", "PROFESSIONAL"].includes(membership.role)).map((membership) => <option key={membership.id} value={membership.id}>{profile.user.name} · {membership.company.name}</option>)}</select></label><label>Nome público do profissional<input name="professionalName" required maxLength={120} /></label><fieldset><legend>Dias disponíveis</legend><div className="k-ops-days">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((label, weekday) => <label key={weekday}><input type="checkbox" name="weekday" value={weekday} />{label}</label>)}</div></fieldset><label>Início<input name="startTime" type="time" defaultValue="09:00" required /></label><label>Fim<input name="endTime" type="time" defaultValue="17:00" required /></label><button className="k-button-primary" disabled={busy === "setup"}>{busy === "setup" ? "Salvando…" : "Salvar configuração inicial"}</button></form></Card>}
    {setup && maySetup && <ServiceManagement companyId={companyId} userId={userId} onChanged={onBookingChange} />}
    {setup && services.length > 0 && <Card><h2>Serviços cadastrados</h2><div className="k-ops-service-list">{services.map((service) => <div key={service.id}><strong>{service.name}</strong><span>{service.durationMinutes} min · {money(service.priceCents)} · {service.active ? "Ativo" : "Inativo"}</span></div>)}</div></Card>}
    {invitation && <Card><h2>Convite para {invitation.name}</h2><p>Confira o contato do cliente antes de compartilhar. O link pode ser usado uma vez e vence em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(invitation.expiresAt))}.</p><label>Link de ativação<input className="k-invitation-link" readOnly value={invitation.url} onFocus={event => event.currentTarget.select()} /></label><button className="k-button-secondary" onClick={() => { void navigator.clipboard.writeText(invitation.url).then(() => setNotice("Link copiado.")).catch(() => setError("Selecione o link e copie manualmente.")); }}>Copiar link</button><button className="k-button-secondary" onClick={() => setInvitation(null)}>Fechar convite</button></Card>}
    <OperationsBoard companyId={companyId} userId={userId} role={role ?? ""} revision={agendaRevision} />
    {(maySetup || role === "PROFESSIONAL") && <CommissionsPanel companyId={companyId} userId={userId} role={role ?? ""} revision={agendaRevision} />}
    {maySetup && <details><summary>Relatório financeiro operacional</summary><FinancialReport /></details>}
    {(maySetup || role === "RECEPTIONIST") && <WaitlistPanel companyId={companyId} userId={userId} manager={maySetup} />}
    {maySetup && <LoyaltyPanel companyId={companyId} userId={userId} manager />}
    {maySetup && <AutomationsPanel companyId={companyId} userId={userId} />}
    <TenantAgenda companyId={companyId} userId={userId} revision={agendaRevision} />
    <section id="solicitacoes" aria-labelledby="booking-requests-title"><div className="k-section-heading"><div><h2 id="booking-requests-title">Solicitações recentes</h2><p>Pedidos públicos aguardam aprovação; o horário só fica confirmado após aceitar.</p></div></div>{loading ? <Card><p role="status">Carregando solicitações…</p></Card> : requests.length === 0 ? <Card><div className="k-empty"><strong>Nenhuma solicitação ainda</strong><p>Quando um cliente enviar um pedido pela agenda pública, ele aparecerá aqui.</p></div></Card> : <div className="k-ops-requests">{requests.map((request) => <Card key={request.id}><div className="k-ops-request-top"><div><h3>{request.customer.name}</h3><span className={`k-badge ${request.status === "CONFIRMED" ? "k-badge-success" : request.status === "REQUESTED" ? "k-badge-warning" : ""}`}>{request.status === "REQUESTED" ? "Aguardando aprovação" : request.status === "CONFIRMED" ? "Confirmado" : request.status === "REJECTED" ? "Recusado" : "Cancelado"}</span></div><small>Pedido {request.id.slice(0, 8).toUpperCase()}</small></div><ul>{request.items.map((item) => <li key={item.id}><strong>{item.serviceName}</strong><span>{item.professional.displayName}</span><time dateTime={item.startsAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}</time><span>{money(item.priceCents)}</span></li>)}</ul>{mayDecide && request.status === "CONFIRMED" && <button className="k-button-primary" disabled={busy === request.id} onClick={() => void openOrder(request.id)}>Abrir ou ver comanda</button>}{mayDecide && request.customer.id && request.customer.email && !request.customer.userId && <button className="k-button-secondary" disabled={busy === request.customer.id} onClick={() => void inviteCustomer(request.customer)}>Gerar convite do cliente</button>}{mayDecide && request.status === "REQUESTED" && <div className="k-actions"><button className="k-button-primary" disabled={busy === request.id} onClick={() => void decide(request.id, "accept")}>Aceitar e confirmar</button><button className="k-button-secondary" disabled={busy === request.id} onClick={() => void decide(request.id, "reject")}>Recusar</button></div>}</Card>)}</div>}</section>
    {!maySetup && <p className="k-muted">As opções administrativas são ocultadas conforme seu papel na empresa.</p>}
  </div>;
}

function parseTime(value: string) { const [hour, minute] = value.split(":").map(Number); return hour! * 60 + minute!; }
