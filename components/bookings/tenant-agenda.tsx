"use client";

import { useEffect, useState } from "react";
import { tenantApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

type Agenda = { timezone: string; items: Array<{ id: string; serviceName: string; startsAt: string; endsAt: string; professional: { id: string; displayName: string }; request: { id: string; customer: { name: string } } }> };

export function TenantAgenda({ companyId, userId, revision }: { companyId: string; userId: string; revision: number }) {
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    async function refresh() {
      try {
        const value = await tenantApi<Agenda>(companyId, `/booking/agenda?${new URLSearchParams({ date })}`, undefined, userId);
        if (live) { setAgenda(value); setError(""); }
      } catch (cause) { if (live) setError(cause instanceof Error ? cause.message : "Não foi possível consultar a agenda."); }
      finally { if (live) setLoading(false); }
    }
    queueMicrotask(() => { if (live) { setLoading(true); setAgenda(null); void refresh(); } });
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { live = false; window.clearInterval(timer); };
  }, [companyId, userId, date, revision]);
  const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: agenda?.timezone, timeStyle: "short" }).format(new Date(value));
  return <section id="agenda" aria-labelledby="internal-agenda-title"><Card>
    <div className="k-section-heading"><div><h2 id="internal-agenda-title">Agenda interna</h2><p>Agendamentos confirmados{agenda ? ` · ${agenda.timezone}` : ""}</p></div><label>Dia da agenda<input aria-label="Dia da agenda" type="date" value={date} required onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label></div>
    {error && <Alert tone="danger">{error}</Alert>}
    {loading ? <p role="status">Carregando agenda…</p> : !error && agenda?.items.length === 0 ? <p>Nenhum agendamento confirmado para este dia.</p> : <ol className="k-agenda-list">{agenda?.items.map((item) => <li key={item.id}><time dateTime={item.startsAt}>{time(item.startsAt)} – {time(item.endsAt)}</time><div><strong>{item.serviceName}</strong><p>{item.request.customer.name} · {item.professional.displayName}</p></div></li>)}</ol>}
  </Card></section>;
}
