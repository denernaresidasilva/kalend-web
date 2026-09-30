"use client";
import { useState, type FormEvent } from "react";
import { communication, providerNames, channelNames, providerChannels, availableProvider, previewText, metaParameters, type CommunicationEvent, type InternalTemplate, type Channel, type ProviderName, type MetaTemplate, type CommunicationProvider } from "@/lib/communication";
import { useCommunicationMutation, useCommunicationPending } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";
const loadTemplates = async (signal?: AbortSignal) => {
  const [events, templates, providers] = await Promise.all([communication.events(signal), communication.templates(signal), communication.providers(signal)]);
  return { events, templates, providers };
};
function MetaReferencePicker({ id, select }: { id: string; select: (row: MetaTemplate) => void }) {
  const resource = useCommunicationResource(communication.metaTemplates);
  return <ResourceState {...resource} retry={() => void resource.load()}><label>Template oficial sincronizado<select value={id} onChange={e => { const row = resource.data?.find(row => row.externalId === e.target.value); if (row) select(row); }}><option value="">Selecione</option>{id && !resource.data?.some(row => row.externalId === id) && <option value={id}>Referência salva: {id} (não encontrada nesta listagem)</option>}{resource.data?.map(row => <option key={row.id} value={row.externalId}>{row.name} · {row.language} · {row.status}</option>)}</select></label><p>Somente templates aprovados, com BODY de texto compatível, podem ser enviados. A validação final ocorre no backend/Meta.</p></ResourceState>;
}
export function InternalTemplateEditor({ event, channel, initial, providers, saved }: { event: CommunicationEvent; channel: Channel; initial?: InternalTemplate; providers: CommunicationProvider[]; saved: (row: InternalTemplate) => void }) {
  const [provider, setProvider] = useState<ProviderName>(initial?.provider ?? (channel === "EMAIL" ? "SMTP" : channel === "WHATSAPP" ? "EVOLUTION" : "PUSH_PENDING"));
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [text, setText] = useState(initial?.content.text ?? ""); const [subject, setSubject] = useState(initial?.content.subject ?? initial?.content.title ?? "");
  const [meta, setMeta] = useState({ id: initial?.content.metaId ?? "", name: initial?.content.metaName ?? "", language: initial?.content.metaLanguage ?? "", parameters: metaParameters(initial?.content ?? {}) });
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const canEnable = availableProvider(provider) && providers.some(row => row.provider === provider && row.adapterAvailable);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (lockRef.current) return;
    if (provider === "META" && (!meta.id || meta.parameters.some(key => !event.variables.includes(key)))) { setError("Selecione um template Meta e utilize apenas variáveis deste evento."); return; }
    if (provider !== "META" && [text, subject].some(value => /[{}]/.test(value.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => event.variables.includes(key) ? "" : match)))) { setError("Use apenas as variáveis disponíveis, no formato {{variavel}}."); return; }
    lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const content = provider === "META" ? meta : { text, ...(channel === "EMAIL" ? { subject } : channel === "PUSH" ? { title: subject } : {}) };
      const row = await communication.saveTemplate(event.event, channel, { provider, enabled: enabled && canEnable, content }); saved(row); setMessage("Template global salvo.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar o template."); }
    finally { lockRef.current = false; setBusy(false); }
  }
  return <form className="commercial-panel commercial-form" onSubmit={submit}><h2>{event.event} · {channelNames[channel]}</h2><p>Política interna global do Kalend. Não é um editor de aprovação da Meta.</p>
    <fieldset disabled={busy}><label>Provedor<select value={provider} onChange={e => { setProvider(e.target.value as ProviderName); setEnabled(false); }}>{(Object.keys(providerNames) as ProviderName[]).filter(name => providerChannels[name] === channel).map(name => <option key={name} value={name}>{providerNames[name]}{!availableProvider(name) ? " · Em breve" : ""}</option>)}</select></label>
      {provider === "META" ? <><MetaReferencePicker id={meta.id} select={row => setMeta({ ...meta, id: row.externalId, name: row.name, language: row.language })} /><p>Referência: {meta.name || "—"} · {meta.language || "—"}</p><label>Quantidade de parâmetros BODY (na ordem da Meta)<input type="number" min={0} max={20} value={meta.parameters.length} onChange={e => { const count = Math.min(20, Math.max(0, Number(e.target.value) || 0)); setMeta({ ...meta, parameters: Array.from({ length: count }, (_, i) => meta.parameters[i] ?? "") }); }} /></label>{meta.parameters.map((key, index) => <label key={index}>Parâmetro {index + 1}<select required value={key} onChange={e => setMeta({ ...meta, parameters: meta.parameters.map((old, i) => i === index ? e.target.value : old) })}><option value="">Selecione a variável</option>{event.variables.map(variable => <option key={variable} value={variable}>{variable}</option>)}</select></label>)}</> : <>
        {channel !== "WHATSAPP" && <label>{channel === "EMAIL" ? "Assunto" : "Título"}<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} /></label>}
        <label>Conteúdo em texto<textarea required rows={8} maxLength={8000} value={text} onChange={e => setText(e.target.value)} /></label>
      </>}
      <p>Variáveis disponíveis: {event.variables.map(key => `{{${key}}}`).join(", ") || "Nenhuma"}</p>
      <label className="commercial-check"><input type="checkbox" disabled={!canEnable} checked={enabled && canEnable} onChange={e => setEnabled(e.target.checked)} />Template ativo</label>{!canEnable && <p>Ativação indisponível para este provedor. É possível salvar um rascunho inativo.</p>}
      <button className="commercial-primary">Salvar template</button>
    </fieldset><section aria-label="Prévia do template"><h3>Prévia ilustrativa</h3>{provider === "META" ? <p>Template oficial: {meta.name || "não selecionado"} · {meta.language}. Parâmetros: {meta.parameters.join(", ") || "nenhum"}.</p> : <><p>{previewText(subject, event.variables)}</p><pre className="communication-preview">{previewText(text, event.variables)}</pre></>}<p>Valores entre colchetes representam variáveis. A prévia não realiza envios.</p></section><Feedback busy={busy} error={error} message={message} />
  </form>;
}
export function CommunicationTemplates() {
  const pending = useCommunicationPending();
  const resource = useCommunicationResource(loadTemplates);
  const [eventId, setEventId] = useState(""); const [channel, setChannel] = useState<Channel>("EMAIL");
  const [updates, setUpdates] = useState<InternalTemplate[]>([]);
  const events = resource.data?.events ?? []; const event = events.find(row => row.event === eventId) ?? events[0];
  const current = event ? [...updates, ...(resource.data?.templates ?? [])].find(row => row.event === event.event && row.channel === channel) : undefined;
  return <ResourceState {...resource} retry={() => void resource.load()}>{!events.length ? <p className="commercial-notice">Nenhum evento retornado pela API.</p> : <><div className="commercial-panel commercial-form"><h2>Templates internos do Kalend</h2><p>A API retorna até 100 templates. O evento e o canal permitem abrir ou criar a política correspondente.</p><div className="communication-form-grid"><label>Evento<select disabled={pending} value={event?.event ?? ""} onChange={e => setEventId(e.target.value)}>{events.map(row => <option key={row.event} value={row.event}>{row.event}</option>)}</select></label><label>Canal<select disabled={pending} value={channel} onChange={e => setChannel(e.target.value as Channel)}>{(Object.keys(channelNames) as Channel[]).map(key => <option key={key} value={key}>{channelNames[key]}</option>)}</select></label></div></div>
    {event && <InternalTemplateEditor key={`${event.event}:${channel}`} event={event} channel={channel} initial={current} providers={resource.data?.providers ?? []} saved={row => setUpdates(old => [row, ...old.filter(item => item.event !== row.event || item.channel !== row.channel)])} />}</>}</ResourceState>;
}
export function CommunicationEvents() {
  const resource = useCommunicationResource(communication.events);
  return <ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><h2>Catálogo de eventos globais</h2>{!resource.data?.length ? <p>Nenhum evento retornado pela API.</p> : <dl className="communication-events">{resource.data.map(row => <div key={row.event}><dt>{row.event}</dt><dd>Variáveis: {row.variables.map(key => `{{${key}}}`).join(", ") || "Nenhuma"}</dd></div>)}</dl>}</section></ResourceState>;
}
