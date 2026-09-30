"use client";
import { useState, type FormEvent } from "react";
import { communication, stateLabel } from "@/lib/communication";
import { date } from "@/lib/commercial";
import { useCommunicationMutation, useMetaSubmissionGuard } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";
export function CommunicationMeta() {
  const resource = useCommunicationResource(communication.metaTemplates);
  const [after, setAfter] = useState<string | null>(null);
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [name, setName] = useState(""); const [language, setLanguage] = useState(""); const [text, setText] = useState("");
  const [syncNeeded, setSyncNeeded] = useMetaSubmissionGuard();
  async function sync(next = false) {
    if (lockRef.current) return; lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try { const result = await communication.syncMeta(next && after ? after : undefined); setAfter(result.after); setMessage(`${result.synced} templates sincronizados nesta página.${result.after ? " Há mais páginas para sincronizar." : " Sincronização concluída."}`); const loaded = await resource.load(); if (!result.after && loaded) setSyncNeeded(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível sincronizar."); }
    finally { lockRef.current = false; setBusy(false); }
  }
  async function create(e: FormEvent) {
    e.preventDefault(); if (lockRef.current || syncNeeded) return;
    if (/[{}]/.test(text)) { setError("Este contrato suporta somente corpo estático, sem variáveis."); return; }
    if (!window.confirm("Enviar este template global para análise da Meta? A aprovação depende da Meta.")) return;
    lockRef.current = true; setBusy(true); setError(""); setMessage(""); setAfter(null); setSyncNeeded(true);
    try { const result = await communication.createMeta({ name, language, category: "UTILITY", text }); setMessage(`Template enviado (ID ${result.externalId}). Sincronize para consultar o status real.`); }
    catch (err) { setError(`${err instanceof Error ? err.message : "Falha no envio."} O resultado pode ser incerto. Sincronize e confira a lista antes de repetir a criação.`); }
    finally { lockRef.current = false; setBusy(false); }
  }
  return <><section className="commercial-panel"><h2>Templates oficiais do WhatsApp Meta</h2><p>Gerenciados e aprovados pela Meta. São distintos das políticas e dos templates internos do Kalend.</p><div className="commercial-actions"><button disabled={busy || resource.loading} onClick={() => void sync()}>Sincronizar desde o início</button>{after && <button disabled={busy || resource.loading} onClick={() => void sync(true)}>Sincronizar próxima página</button>}<button disabled={busy || resource.loading} onClick={() => void resource.load()}>Atualizar lista local</button></div></section>
    <ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><p>Até 100 templates sincronizados da conta e do ambiente atualmente configurados.</p>{!resource.data?.length ? <p>Nenhum template Meta sincronizado.</p> : <div className="commercial-table-wrap" role="region" aria-label="Templates Meta" tabIndex={0}><table><thead><tr><th>Nome</th><th>Idioma</th><th>Categoria</th><th>Status Meta</th><th>Sincronizado em</th><th>Corpo</th></tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.language}</td><td>{row.category}</td><td>{stateLabel(row.status)}</td><td>{date(row.syncedAt)}</td><td className="communication-text">{row.components.map(part => part.text ?? "").filter(Boolean).join("\n")}</td></tr>)}</tbody></table></div>}</section>
      <form className="commercial-panel commercial-form" onSubmit={create}><h2>Criar template na Meta</h2><p>Contrato disponível: categoria UTILITY, um BODY de texto estático, sem variáveis. A submissão não significa aprovação.</p><fieldset disabled={busy || syncNeeded}><div className="communication-form-grid"><label>Nome<input required maxLength={512} pattern="[a-z0-9_]+" value={name} onChange={e => setName(e.target.value)} /></label><label>Idioma (ex.: pt_BR)<input required maxLength={20} pattern="[a-z]{2,3}(_[A-Z]{2})?" value={language} onChange={e => setLanguage(e.target.value)} /></label></div><label>Corpo estático<textarea required rows={5} maxLength={1024} value={text} onChange={e => setText(e.target.value)} /></label><button className="commercial-primary">Enviar para análise da Meta</button></fieldset>{syncNeeded && <p>Conclua todas as páginas da sincronização e carregue a lista para conferir o resultado antes de fazer outra submissão.</p>}</form>
    </ResourceState><Feedback busy={busy} error={error} message={message} /></>;
}
