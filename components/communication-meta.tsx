"use client";
import { useState } from "react";
import { communication, stateLabel } from "@/lib/communication";
import { date } from "@/lib/commercial";
import { useCommunicationMutation } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";
export function CommunicationMeta() {
  const resource = useCommunicationResource(communication.metaTemplates);
  const [after, setAfter] = useState<string | null>(null);
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function sync(next = false) {
    if (lockRef.current) return; lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try { const result = await communication.syncMeta(next && after ? after : undefined); setAfter(result.after); setMessage(`${result.synced} templates sincronizados nesta página.${result.after ? " Há mais páginas para sincronizar." : " Sincronização concluída."}`); const loaded = await resource.load(); void loaded; }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível sincronizar."); }
    finally { lockRef.current = false; setBusy(false); }
  }
  return <><section className="commercial-panel"><h2>Templates oficiais do WhatsApp Meta</h2><p>Catálogo remoto de consulta. Crie e submeta o conteúdo na aba Templates internos; a mensagem salva no Kalend é a fonte única.</p><div className="commercial-actions"><button disabled={busy || resource.loading} onClick={() => void sync()}>Sincronizar desde o início</button>{after && <button disabled={busy || resource.loading} onClick={() => void sync(true)}>Sincronizar próxima página</button>}<button disabled={busy || resource.loading} onClick={() => void resource.load()}>Atualizar lista local</button></div></section>
    <ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><p>Até 100 templates sincronizados da conta e do ambiente atualmente configurados.</p>{!resource.data?.length ? <p>Nenhum template Meta sincronizado.</p> : <div className="commercial-table-wrap" role="region" aria-label="Templates Meta" tabIndex={0}><table><thead><tr><th>Nome</th><th>Idioma</th><th>Categoria</th><th>Status Meta</th><th>Sincronizado em</th><th>Corpo</th></tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.language}</td><td>{row.category}</td><td>{stateLabel(row.status)}</td><td>{date(row.syncedAt)}</td><td className="communication-text">{row.components.map(part => part.text ?? "").filter(Boolean).join("\n")}</td></tr>)}</tbody></table></div>}</section>
    </ResourceState><Feedback busy={busy} error={error} message={message} /></>;
}
