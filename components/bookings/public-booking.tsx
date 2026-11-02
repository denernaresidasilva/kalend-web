"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import styles from "./public-booking.module.css";

type Professional = { id: string; name: string };
type Service = { id: string; name: string; description: string | null; category: string | null; durationMinutes: number; priceCents: number; professionals: Professional[] };
type Catalog = { company: { name: string; slug: string }; timezone: string; services: Service[] };
type Availability = { professionals: Array<Professional & { slots: string[] }> };
type CartItem = { serviceId: string; serviceName: string; professionalId: string; professionalName: string; startsAt: string; durationMinutes: number; priceCents: number };
type BookingResult = { id: string; status: string; items: Array<{ serviceName: string; professional: { displayName: string }; startsAt: string; durationMinutes: number; priceCents: number }> };

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function PublicBooking({ slug }: { slug: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Service | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [availability, setAvailability] = useState<{ key: string; data: Availability } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [identifying, setIdentifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<BookingResult | null>(null);
  const idempotency = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/public/booking/${encodeURIComponent(slug)}/catalog`, { cache: "no-store", credentials: "omit" })
      .then(async (response) => { if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? "Este estabelecimento não está disponível para agendamentos online." : "Não foi possível carregar o catálogo."); return response.json() as Promise<Catalog>; })
      .then((value) => { if (live) setCatalog(value); })
      .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o catálogo."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [slug]);

  useEffect(() => {
    if (!selected || !catalog) return;
    const query = new URLSearchParams({ serviceId: selected.id, date });
    const key = `${selected.id}:${date}`;
    let live = true;
    fetch(`${API_URL}/public/booking/${encodeURIComponent(slug)}/availability?${query}`, { cache: "no-store", credentials: "omit" })
      .then(async (response) => { if (!response.ok) throw new Error("Não foi possível consultar os horários."); return response.json() as Promise<Availability>; })
      .then((value) => { if (live) setAvailability({ key, data: value }); })
      .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "Não foi possível consultar os horários."); });
    return () => { live = false; };
  }, [selected, date, slug, catalog]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.priceCents, 0), [cart]);
  const currentAvailability = selected && availability?.key === `${selected.id}:${date}` ? availability.data : null;
  const dateMinimum = new Intl.DateTimeFormat("en-CA", { timeZone: catalog?.timezone ?? "America/Sao_Paulo" }).format(new Date());
  const displayTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: catalog?.timezone ?? "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  async function submit(form: HTMLFormElement) {
    setError("");
    const data = new FormData(form);
    const basePayload = {
      termsAccepted: data.get("terms") === "on",
      marketingOptIn: data.get("marketing") === "on",
      customer: { name: data.get("name"), email: data.get("email") || undefined, phone: data.get("phone") },
      items: cart.map(({ serviceId, professionalId, startsAt }) => ({ serviceId, professionalId, startsAt })),
    };
    const signature = JSON.stringify(basePayload);
    if (!idempotency.current || idempotency.current.signature !== signature) idempotency.current = { signature, key: crypto.randomUUID() };
    const payload = { ...basePayload, idempotencyKey: idempotency.current.key };
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/public/booking/${encodeURIComponent(slug)}/requests`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Não foi possível enviar a solicitação. Revise os horários e tente novamente.");
      setSuccess(result as BookingResult);
      idempotency.current = null;
      setIdentifying(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar a solicitação."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main className={styles.page}><p role="status">Carregando serviços…</p></main>;
  if (success) return <main className={styles.page}><section className={`${styles.panel} ${styles.success}`}><span aria-hidden="true">✓</span><h1>Solicitação enviada com sucesso!</h1><p>Seu pedido foi enviado para {catalog?.company.name}. Aguarde a confirmação do estabelecimento.</p><p>Referência: <strong>{success.id.slice(0, 8).toUpperCase()}</strong> · Status: <strong>{success.status === "REQUESTED" ? "Aguardando confirmação" : success.status}</strong></p><ul className={styles.cart}>{success.items.map((item, index) => <li key={`${item.serviceName}:${item.startsAt}:${index}`}><div><strong>{item.serviceName}</strong><span>{item.professional.displayName} · {displayTime(item.startsAt)}</span><span>{item.durationMinutes} min · {money(item.priceCents)}</span></div></li>)}</ul><p>Total solicitado: <strong>{money(success.items.reduce((sum, item) => sum + item.priceCents, 0))}</strong></p><p>O horário fica reservado provisoriamente por até 10 minutos. Se o prazo passar, a disponibilidade será conferida novamente antes da confirmação.</p></section></main>;

  return <main className={styles.page}>
    <header className={styles.header}><Link href={`/agendar/${encodeURIComponent(slug)}`} className={styles.brand}>{catalog?.company.name ?? "Agendamento"}</Link><Link className={styles.login} href="/">Entrar</Link></header>
    <div className={styles.content}>
      <section className={styles.intro}><p className={styles.eyebrow}>AGENDA ONLINE</p><h1>Escolha seus serviços</h1><p>Selecione os serviços, encontre um horário e envie sua solicitação ao estabelecimento.</p></section>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {catalog?.services.length ? <div className={styles.columns}>
        <section aria-label="Catálogo de serviços" className={styles.catalog}>
          <div className={styles.sectionHead}><h2>{selected ? `Horários · ${selected.name}` : "Serviços disponíveis"}</h2>{selected && <button className={styles.link} type="button" onClick={() => setSelected(null)}>Voltar ao catálogo</button>}</div>
          {!selected ? <div className={styles.serviceList}>{catalog.services.map((service) => <article className={styles.service} key={service.id}><div><p className={styles.category}>{service.category ?? "Serviço"}</p><h3>{service.name}</h3>{service.description && <p>{service.description}</p>}<p className={styles.meta}>{service.durationMinutes} min <strong>{money(service.priceCents)}</strong></p><p className={styles.meta}>Profissionais: {service.professionals.map((professional) => professional.name).join(", ")}</p></div><button className={styles.primary} type="button" onClick={() => setSelected(service)}>Escolher horário</button></article>)}</div> : <div className={styles.schedule}><label>Data<input type="date" value={date} min={dateMinimum} onChange={(event) => setDate(event.target.value)} /></label>{!currentAvailability ? <p role="status">Consultando disponibilidade…</p> : currentAvailability.professionals.map((professional) => <section key={professional.id} className={styles.professional}><h3>{professional.name}</h3>{professional.slots.length ? <div className={styles.slots}>{professional.slots.map((slot) => <button key={slot} type="button" disabled={cart.length >= 8 || cart.some(item => new Date(slot).getTime() < new Date(item.startsAt).getTime() + item.durationMinutes * 60_000 && new Date(slot).getTime() + selected.durationMinutes * 60_000 > new Date(item.startsAt).getTime())} onClick={() => { setCart((current) => [...current, { serviceId: selected.id, serviceName: selected.name, professionalId: professional.id, professionalName: professional.name, startsAt: slot, durationMinutes: selected.durationMinutes, priceCents: selected.priceCents }]); setSelected(null); }}>{new Intl.DateTimeFormat("pt-BR", { timeZone: catalog.timezone, timeStyle: "short" }).format(new Date(slot))}</button>)}</div> : <p className={styles.muted}>Sem horários disponíveis nesta data.</p>}</section>)}</div>}
        </section>
        <aside className={styles.panel} aria-label="Carrinho de agendamentos"><div className={styles.sectionHead}><h2>Seu carrinho</h2><span>{cart.length} {cart.length === 1 ? "serviço" : "serviços"}</span></div>{cart.length ? <><ul className={styles.cart}>{cart.map((item, index) => <li key={`${item.serviceId}:${item.startsAt}:${index}`}><div><strong>{item.serviceName}</strong><span>{item.professionalName} · {displayTime(item.startsAt)}</span><span>{item.durationMinutes} min · {money(item.priceCents)}</span></div><button className={styles.remove} type="button" aria-label={`Remover ${item.serviceName}`} onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></li>)}</ul><div className={styles.total}><span>Total</span><strong>{money(total)}</strong></div>{identifying ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}><h3>Seus dados</h3><label>Nome completo<input required name="name" maxLength={160} autoComplete="name" /></label><label>E-mail<input name="email" type="email" maxLength={254} autoComplete="email" /></label><label>WhatsApp<input required name="phone" type="tel" maxLength={32} autoComplete="tel" placeholder="+55 11 99999-9999" /></label><label className={styles.checkbox}><input required type="checkbox" name="terms" />Li e aceito os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</label><label className={styles.checkbox}><input type="checkbox" name="marketing" />Quero receber novidades e ofertas (opcional).</label><button className={styles.primary} disabled={submitting}>{submitting ? "Enviando…" : "Enviar solicitação"}</button><button type="button" className={styles.link} onClick={() => setIdentifying(false)}>Voltar ao carrinho</button></form> : <div className={styles.cartActions}><button className={styles.secondary} type="button" onClick={() => { setSelected(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Escolher mais serviços</button><button className={styles.primary} type="button" onClick={() => setIdentifying(true)}>Solicitar agendamento</button></div>}</> : <div className={styles.empty}><p>Escolha até oito serviços, sem sobrepor seus horários.</p><p>Escolha um serviço para começar.</p></div>}<p className={styles.notice}>O horário só será confirmado após aprovação do estabelecimento. A seleção atual não bloqueia a agenda.</p></aside>
      </div> : <section className={styles.panel}><h2>Agendamento online indisponível</h2><p>Este estabelecimento ainda não publicou serviços com profissionais e horários configurados.</p></section>}
    </div>
  </main>;
}
