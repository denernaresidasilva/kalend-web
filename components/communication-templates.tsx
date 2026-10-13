"use client";
import { useState, type FormEvent } from "react";
import { communication, eventLabel, channelNames, providerChannels, previewText, providerState, type CommunicationEvent, type InternalTemplate, type Channel, type ProviderName, type CommunicationProvider } from "@/lib/communication";
import { useCommunicationMutation, useCommunicationPending } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";
const variableLabels: Record<string, string> = { nome: "Nome", empresa: "Empresa", plano: "Plano", dias_trial: "Dias do teste", vencimento: "Vencimento", valor: "Valor" };
const loadTemplates = async (signal?: AbortSignal) => {
  const [events, templates, providers] = await Promise.all([communication.events(signal), communication.templates(signal), communication.providers(signal)]);
  return { events, templates, providers };
};
function copyWithDocumentFallback(value: string) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") throw new Error("Clipboard indisponível");
  const field = document.createElement("textarea");
  field.value = value; field.setAttribute("readonly", "");
  field.style.position = "fixed"; field.style.opacity = "0"; field.style.pointerEvents = "none";
  document.body.appendChild(field);
  try { field.select(); if (!document.execCommand("copy")) throw new Error("Cópia recusada"); }
  finally { field.remove(); }
}
export function InternalTemplateEditor({ event, channel, initial, providers, saved }: { event: CommunicationEvent; channel: Channel; initial?: InternalTemplate; providers: CommunicationProvider[]; saved: (row: InternalTemplate) => void }) {
  const [row, setRow] = useState(initial);
  const [provider] = useState<ProviderName>(initial?.provider ?? (channel === "EMAIL" ? "SMTP" : channel === "WHATSAPP" ? "EVOLUTION" : "PUSH_PENDING"));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [text, setText] = useState(initial?.content.text ?? "");
  const [subject, setSubject] = useState(initial?.content.subject ?? initial?.content.title ?? "");
  const [name, setName] = useState(initial?.content.name ?? event.event.toLowerCase());
  const [language, setLanguage] = useState(initial?.content.language ?? "pt_BR");
  const [category, setCategory] = useState(initial?.content.category ?? "UTILITY");
  const [examples, setExamples] = useState<Record<string, string>>(() => {
    try {
      const keys = [...new Set([...(initial?.content.text ?? "").matchAll(/\{\{([a-z_]+)\}\}/g)].map(match => match[1]))];
      const values: unknown = JSON.parse(initial?.content.examples ?? "[]");
      return Object.fromEntries(keys.map((key, i) => [key, Array.isArray(values) && typeof values[i] === "string" ? values[i] : ""]));
    } catch { return {}; }
  });
  const [dirty, setDirty] = useState(false); const [copiedVariable, setCopiedVariable] = useState("");
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const metaCanEnable = provider !== "META" || row?.approvalStatus === "APPROVED" && !dirty;
  const keys = [...new Set([...text.matchAll(/\{\{([a-z_]+)\}\}/g)].map(m => m[1]))].filter(k => event.variables.includes(k));
  function accept(next: InternalTemplate) {
    setRow(next); setEnabled(next.enabled);
    if (next.content) {
      setText(next.content.text); setSubject(next.content.subject ?? next.content.title ?? "");
    }
    saved(next);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (lockRef.current) return;
    if ([text, subject].some(value => /[{}]/.test(value.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => event.variables.includes(key) ? "" : match)))) { setError("Use apenas as variáveis disponíveis, no formato {{variavel}}."); return; }
    lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const content = { text, ...(channel === "EMAIL" ? { subject } : channel === "PUSH" ? { title: subject } : {}),
        ...(provider === "META" ? { name, language, category, examples: Object.fromEntries(keys.map(k => [k, examples[k] ?? ""])) } : {}) };
      const next = await communication.saveTemplate(event.event, channel, { ...(initial?.provider === "META" ? { provider: "META" as const } : {}), enabled: enabled && metaCanEnable, content });
      accept(next); setDirty(false); setMessage("Template salvo com sucesso.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar o template."); }
    finally { lockRef.current = false; setBusy(false); }
  }
  async function metaOperation(sync: boolean) {
    if (lockRef.current || !row || dirty) return;
    lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (sync) {
        const result = await communication.syncMeta();
        const current = (await communication.templates()).find(t => t.id === row.id);
        if (current) accept(current);
        setMessage(result.after ? "Página sincronizada. Há mais páginas no catálogo Meta; continue a sincronização na aba Meta." : "Status sincronizado com a Meta.");
      } else {
        const result = await communication.createMeta(row.id); accept(result.template);
        setMessage(result.alreadySubmitted ? "Esta revisão já foi submetida ou tem resultado incerto. Sincronize antes de qualquer nova ação." : "Conteúdo salvo submetido. A aprovação depende da Meta.");
      }
    } catch (err) {
      if (!sync) setRow({ ...row, metaSubmissionState: "UNCERTAIN" });
      setError(err instanceof Error ? err.message : "Não foi possível consultar a Meta.");
    } finally { lockRef.current = false; setBusy(false); }
  }
  async function copy(key: string) {
    const placeholder = `{{${key}}}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(placeholder); }
        catch { copyWithDocumentFallback(placeholder); }
      } else copyWithDocumentFallback(placeholder);
      setError(""); setMessage(`${placeholder} copiado`); setCopiedVariable(key);
      setTimeout(() => setCopiedVariable(current => current === key ? "" : current), 1800);
    } catch { setError("Não foi possível copiar a variável. Tente novamente."); setMessage(""); }
  }
  const approval = row?.provider === provider ? row?.approvalStatus ?? "PENDING" : "PENDING";
  return <form className="commercial-panel commercial-form" onSubmit={submit}><h2>{eventLabel(event.event)} · {channelNames[channel]}</h2><p>Template GLOBAL, gerenciado pelo Super Admin. O conteúdo salvo é a fonte da mensagem e da submissão Meta.</p>
    <fieldset disabled={busy}><p>O canal utiliza automaticamente a configuração ativa do sistema.</p>
      {channel !== "WHATSAPP" && <label>{channel === "EMAIL" ? "Assunto" : "Título"}<input required maxLength={200} value={subject} onChange={e => { setSubject(e.target.value); setDirty(true); }} /></label>}
      <label>{channel === "PUSH" ? "Mensagem" : "Conteúdo em texto"}<textarea required rows={8} maxLength={provider === "META" ? 1024 : 8000} value={text} onChange={e => { setText(e.target.value); setDirty(true); }} /></label>
      {channel === "WHATSAPP" && <p>{text.length}/{provider === "META" ? 1024 : 8000} caracteres</p>}
      {provider === "META" && <><label>Nome<input required pattern="[a-z0-9_]+" maxLength={400} value={name} onChange={e => { setName(e.target.value); setDirty(true); }} /></label><label>Idioma<input required value={language} onChange={e => { setLanguage(e.target.value); setDirty(true); }} /></label><label>Categoria<select value={category} onChange={e => { setCategory(e.target.value); setDirty(true); }}><option value="UTILITY">Utilidade</option><option value="MARKETING">Marketing</option></select></label>{keys.map(key => <label key={key}>Exemplo para {`{{${key}}}`}<input required maxLength={200} value={examples[key] ?? ""} onChange={e => { setExamples({ ...examples, [key]: e.target.value }); setDirty(true); }} /></label>)}<p>Somente BODY de texto. Variáveis são convertidas em parâmetros posicionais na integração. Não coloque variáveis no início/fim ou lado a lado. Informe exemplos fictícios; não inclua dados pessoais reais.</p></>}
      <div className="communication-variable-buttons" aria-label="Variáveis disponíveis">{event.variables.map(key => { const label = variableLabels[key] ?? key; return <button className={copiedVariable === key ? "copied" : ""} type="button" key={key} title={`Copiar {{${key}}}`} aria-label={`Copiar variável ${label}`} onClick={() => void copy(key)}>{label}</button>; })}</div>
      <label className="commercial-check"><input type="checkbox" disabled={!metaCanEnable} checked={enabled && metaCanEnable} onChange={e => setEnabled(e.target.checked)} />Template ativo</label>
      <p role="status">O estado ativo do template é independente da configuração do provider. Canal: {providerState(providers.find(p => providerChannels[p.provider] === channel && p.provider === provider))}.</p>
      <button className="commercial-primary">Salvar template</button>
      {provider === "META" && <section aria-label="Aprovação Meta"><p role="status">{approval === "APPROVED" && !dirty ? "🟢 APROVADO" : approval === "REJECTED" && !dirty ? "🔴 REJEITADO" : "🟡 PENDENTE — Aguardando aprovação da Meta."}</p>{dirty && <p>Salve a alteração; mudanças no conteúdo exigem nova aprovação.</p>}<p>Revisão: {row?.revision ?? "—"} · Nome Meta: {row?.metaSubmittedName ?? "—"} · ID Meta: {row?.metaTemplateId ?? "—"} · Status Meta: {row?.metaStatus ?? "Não recebido"}</p><p>Submissão: {row?.metaSubmittedAt ?? "—"} · Última sincronização: {row?.metaSyncedAt ?? "—"}</p>{row?.metaRejectionReason && <p>Motivo: {row.metaRejectionReason} · Data do evento Meta: {row.metaStatusAt ?? "Não fornecida"}</p>}<button type="button" disabled={!row || dirty || !!row.metaSubmissionState} onClick={() => void metaOperation(false)}>Enviar conteúdo salvo para aprovação</button><button type="button" disabled={!row || dirty} onClick={() => void metaOperation(true)}>Sincronizar aprovação</button>{row?.metaSubmissionState === "UNCERTAIN" && <p>Resultado incerto. Sincronize; não repita a submissão desta revisão.</p>}</section>}
    </fieldset><section aria-label="Prévia do template"><h3>Prévia ilustrativa{channel === "PUSH" ? " — KALEND" : ""}</h3>{channel !== "WHATSAPP" && <p>{previewText(subject, event.variables)}</p>}<pre className="communication-preview">{previewText(text, event.variables)}</pre><p>Valores entre colchetes representam variáveis. A prévia não realiza envios.</p></section><Feedback busy={busy} error={error} message={message} />
  </form>;
}
export function CommunicationTemplates() {
  const pending = useCommunicationPending();
  const resource = useCommunicationResource(loadTemplates);
  const [eventId, setEventId] = useState(""); const [channel, setChannel] = useState<Channel>("EMAIL");
  const [updates, setUpdates] = useState<InternalTemplate[]>([]);
  const events = resource.data?.events ?? []; const event = events.find(row => row.event === eventId) ?? events[0];
  const current = event ? [...updates, ...(resource.data?.templates ?? [])].find(row => row.event === event.event && row.channel === channel) : undefined;
  return <ResourceState {...resource} retry={() => void resource.load()}>{!events.length ? <p className="commercial-notice">Nenhum evento retornado pela API.</p> : <><div className="commercial-panel commercial-form"><h2>Templates internos do Kalend</h2><p>A API retorna até 100 templates. O evento e o canal permitem abrir ou criar a política correspondente.</p><div className="communication-form-grid"><label>Evento<select disabled={pending} value={event?.event ?? ""} onChange={e => setEventId(e.target.value)}>{events.map(row => <option key={row.event} value={row.event}>{eventLabel(row.event)}</option>)}</select></label><label>Canal<select disabled={pending} value={channel} onChange={e => setChannel(e.target.value as Channel)}>{(Object.keys(channelNames) as Channel[]).map(key => <option key={key} value={key}>{channelNames[key]}</option>)}</select></label></div></div>
    {event && <InternalTemplateEditor key={`${event.event}:${channel}`} event={event} channel={channel} initial={current} providers={resource.data?.providers ?? []} saved={row => setUpdates(old => [row, ...old.filter(item => item.event !== row.event || item.channel !== row.channel)])} />}</>}</ResourceState>;
}
export function CommunicationEvents() {
  const resource = useCommunicationResource(communication.events);
  return <ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><h2>Catálogo de eventos globais</h2>{!resource.data?.length ? <p>Nenhum evento retornado pela API.</p> : <dl className="communication-events">{resource.data.map(row => <div key={row.event}><dt>{eventLabel(row.event)}</dt><dd>Variáveis: {row.variables.map(key => `{{${key}}}`).join(", ") || "Nenhuma"}</dd></div>)}</dl>}</section></ResourceState>;
}
