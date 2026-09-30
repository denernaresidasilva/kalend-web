"use client";
import { useRef, useState } from "react";
import { AdminSection } from "@/components/admin-section";
import { useAuth } from "@/components/auth-provider";
import { isSuperAdmin } from "@/lib/contracts";
import { CommunicationOverview } from "@/components/communication-overview";
import { CommunicationProviders } from "@/components/communication-providers";
import { CommunicationTemplates, CommunicationEvents } from "@/components/communication-templates";
import { CommunicationMeta } from "@/components/communication-meta";
import { CommunicationOutbox, CommunicationDeliveries, CommunicationLogs } from "@/components/communication-records";
import { CommunicationOperations, useCommunicationPending } from "@/components/communication-operations";
const sections = { overview: "Visão geral", providers: "Canais", templates: "Templates internos", events: "Eventos", meta: "Meta Templates", outbox: "Fila / Outbox", deliveries: "Entregas", failures: "Falhas", logs: "Logs" };
export default function CommunicationPage() {
  return <CommunicationOperations><CommunicationContent /></CommunicationOperations>;
}
export function CommunicationContent() {
  const pending = useCommunicationPending();
  const dirty = useRef(false);
  function navigate(next: keyof typeof sections) {
    if (pending || next === section) return;
    if (dirty.current && !window.confirm("Sair desta seção? Os campos editados que ainda não foram salvos serão descartados.")) return;
    dirty.current = false; setSection(next);
  }
  const { profile, loading } = useAuth();
  const [section, setSection] = useState<keyof typeof sections>("overview");
  if (loading) return <main className="auth-state" role="status">Verificando sessão…</main>;
  if (!isSuperAdmin(profile)) return <main className="auth-state">Acesso não autorizado.</main>;
  return <AdminSection><main className="commercial-page communication-page"><header className="commercial-heading"><div><p>SUPER ADMIN · ESCOPO GLOBAL</p><h1>Comunicação Global do Kalend</h1><p>Mensagens enviadas pela plataforma Kalend aos proprietários das empresas.</p></div></header>
    <nav className="communication-navigation" aria-label="Seções da comunicação">{(Object.keys(sections) as (keyof typeof sections)[]).map(key => <button key={key} aria-current={section === key ? "page" : undefined} className={section === key ? "commercial-primary" : ""} disabled={pending} onClick={() => navigate(key)}>{sections[key]}</button>)}</nav>
    <section aria-label={sections[section]} key={section} onChangeCapture={event => { if ((event.target as HTMLElement).closest("form")) dirty.current = true; }}>
      {section === "overview" && <CommunicationOverview />}{section === "providers" && <CommunicationProviders />}{section === "templates" && <CommunicationTemplates />}{section === "events" && <CommunicationEvents />}{section === "meta" && <CommunicationMeta />}{section === "outbox" && <CommunicationOutbox />}{section === "deliveries" && <CommunicationDeliveries />}{section === "failures" && <CommunicationDeliveries failures />}{section === "logs" && <CommunicationLogs />}
    </section>
  </main></AdminSection>;
}
