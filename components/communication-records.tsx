"use client";
import { useState } from "react";
import { communication, canReprocess, channelNames, providerNames, stateLabel, type Delivery } from "@/lib/communication";
import { date } from "@/lib/commercial";
import { useCommunicationMutation } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";
export function ReprocessAction({ row, refreshed, report }: { row: Delivery; refreshed: () => Promise<unknown>; report?: (message: string, error: string) => void }) {
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [stale, setStale] = useState(false);
  if (!canReprocess(row)) return null;
  async function run() {
    if (lockRef.current || stale || !window.confirm("Antecipar a nova tentativa desta entrega global? O backend verificará se o reprocessamento é seguro.")) return;
    lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try { const result = await communication.reprocess(row.id); if (result.queued) { const text = "Nova tentativa solicitada. O worker fará o processamento."; setMessage(text); report?.(text, ""); } }
    catch (err) { const text = err instanceof Error ? err.message : "Não foi possível reprocessar."; setError(text); report?.("", text); }
    finally { setStale(true); await refreshed(); lockRef.current = false; setBusy(false); }
  }
  return <><button disabled={busy || stale} onClick={() => void run()}>Reprocessar</button><Feedback busy={busy} error={error} message={message} /></>;
}
export function CommunicationDeliveries({ failures = false }: { failures?: boolean }) {
  const resource = useCommunicationResource(failures ? communication.failures : communication.deliveries);
  const [notice, setNotice] = useState({ message: "", error: "" });
  return <><button disabled={resource.loading} onClick={() => void resource.load()}>Atualizar {failures ? "falhas" : "entregas"}</button><Feedback busy={false} {...notice} /><ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><h2>{failures ? "Falhas globais" : "Entregas globais"}</h2><p>Até 100 registros mais recentes desta consulta. Aceito pelo provedor não significa entregue. Evolution não possui confirmação completa de entrega.</p>{failures && <p>Esta consulta inclui FAILED, UNSENDABLE e UNCERTAIN. Resultados incertos não podem ser reprocessados por esta ação.</p>}
    {!resource.data?.length ? <p>Nenhuma {failures ? "falha" : "entrega"} encontrada.</p> : <div className="commercial-table-wrap" role="region" aria-label={failures ? "Falhas" : "Entregas"} tabIndex={0}><table><thead><tr><th>Entrega / Outbox</th><th>Canal / Provedor</th><th>Destinatário mascarado</th><th>Status</th><th>Tentativas</th><th>Criada em</th><th>Próxima tentativa</th><th>Erro sanitizado</th>{!failures && <th>Ação</th>}</tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td className="communication-text">{row.id}<br />Outbox: {row.outboxId}</td><td>{channelNames[row.channel]}<br />{providerNames[row.provider]}<br />{row.environment === "SANDBOX" ? "Sandbox" : "Produção"}</td><td>{row.recipientMasked}</td><td>{stateLabel(row.status)}</td><td>{row.attempts}</td><td>{date(row.createdAt)}</td><td>{row.status === "RETRY" || row.status === "PENDING" ? date(row.nextAttemptAt) : "—"}</td><td className="communication-text">{row.lastError ?? "—"}</td>{!failures && <td><ReprocessAction row={row} refreshed={resource.load} report={(message, error) => setNotice({ message, error })} /></td>}</tr>)}</tbody></table></div>}
    <p>O contrato de entregas não fornece o nome do evento; use o ID da outbox para correlacionar registros. Não há filtros ou paginação na API atual.</p>
  </section></ResourceState></>;
}
export function CommunicationOutbox() {
  const resource = useCommunicationResource(communication.outbox);
  return <><button disabled={resource.loading} onClick={() => void resource.load()}>Atualizar fila</button><ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><h2>Fila / Outbox global</h2><p>Até 100 registros mais recentes. Sem paginação ou filtros no contrato atual. A outbox representa eventos; canais e destinatários são definidos na expansão em entregas.</p>
    {!resource.data?.length ? <p>Nenhum evento na outbox.</p> : <div className="commercial-table-wrap" role="region" aria-label="Outbox" tabIndex={0}><table><thead><tr><th>ID</th><th>Evento</th><th>Criado em</th><th>Expansão</th><th>Erro sanitizado</th></tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.event}</td><td>{date(row.createdAt)}</td><td>{row.expandedAt ? date(row.expandedAt) : "Ainda não expandido"}</td><td>{row.lastError ?? "—"}</td></tr>)}</tbody></table></div>}
  </section></ResourceState></>;
}
export function CommunicationLogs() {
  const resource = useCommunicationResource(communication.logs);
  return <><button disabled={resource.loading} onClick={() => void resource.load()}>Atualizar logs</button><ResourceState {...resource} retry={() => void resource.load()}><section className="commercial-panel"><h2>Logs globais</h2><p>Até 100 registros mais recentes, sem filtros ou paginação na API atual.</p>{!resource.data?.length ? <p>Nenhum log encontrado.</p> : <div className="commercial-table-wrap" role="region" aria-label="Logs" tabIndex={0}><table><thead><tr><th>Data</th><th>Ação</th><th>Código</th><th>Tentativa</th><th>Entrega</th><th>Outbox</th></tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td>{date(row.createdAt)}</td><td>{row.action}</td><td>{row.code ?? "—"}</td><td>{row.attempt ?? "—"}</td><td>{row.deliveryId ?? "—"}</td><td>{row.outboxId ?? "—"}</td></tr>)}</tbody></table></div>}</section></ResourceState></>;
}
