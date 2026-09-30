"use client";
import { communication } from "@/lib/communication";
import { ProviderCards } from "./communication-providers";
import { ResourceState, useCommunicationResource } from "./communication-resource";
export function CommunicationOverview() {
  const providers = useCommunicationResource(communication.providers);
  const outbox = useCommunicationResource(communication.outbox);
  const deliveries = useCommunicationResource(communication.deliveries);
  const failures = useCommunicationResource(communication.failures);
  return <><section className="commercial-panel"><h2>Estado dos canais globais</h2><ResourceState {...providers} retry={() => void providers.load()}><dl className="commercial-details"><div><dt>Credenciais configuradas</dt><dd>{providers.data?.filter(row => row.configured).length ?? 0}</dd></div><div><dt>Conectados e com adapter disponível</dt><dd>{providers.data?.filter(row => row.status === "CONNECTED" && row.adapterAvailable).length ?? 0}</dd></div><div><dt>Com falha de conexão</dt><dd>{providers.data?.filter(row => row.status === "FAILED").length ?? 0}</dd></div></dl><ProviderCards providers={providers.data ?? []} /></ResourceState></section>
    <section className="commercial-panel"><h2>Recorte operacional</h2><p>Cada consulta retorna até 100 registros. As contagens abaixo descrevem apenas os registros retornados, não totais da plataforma.</p><div className="gateway-grid">
      <div><h3>Outbox recente</h3><ResourceState {...outbox} retry={() => void outbox.load()}><p>{outbox.data?.length ?? 0} eventos retornados; {outbox.data?.filter(row => !row.expandedAt).length ?? 0} ainda não expandidos neste recorte.</p></ResourceState></div>
      <div><h3>Entregas recentes</h3><ResourceState {...deliveries} retry={() => void deliveries.load()}><p>{deliveries.data?.length ?? 0} entregas retornadas; {deliveries.data?.filter(row => row.status === "PENDING" || row.status === "RETRY").length ?? 0} pendentes ou aguardando nova tentativa neste recorte.</p></ResourceState></div>
      <div><h3>Falhas recentes</h3><ResourceState {...failures} retry={() => void failures.load()}><p>{failures.data?.length ?? 0} falhas retornadas, incluindo resultados incertos e destinatários não enviáveis.</p></ResourceState></div>
    </div></section></>;
}
