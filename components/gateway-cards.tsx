import Link from "next/link";
import type { Gateway } from "@/lib/contracts";
import { gatewayNames, gatewayStatuses } from "@/lib/commercial";
export function GatewayCards({ gateways }: { gateways: Gateway[] }) {
  return <div className="gateway-grid">{Object.entries(gatewayNames).map(([key, name]) => {
    const gateway = gateways.find(item => item.gateway === key);
    return <Link className="gateway-card" key={key} href={`/super-admin/configuracoes/pagamentos/${key}`}>
      <span className={`provider-wordmark provider-${key.toLowerCase()}`}>{name}</span>
      {gateway ? <><div className="commercial-badges"><span>{gateway.enabled ? "Habilitado" : "Desabilitado"}</span><span>{gateway.environment === "SANDBOX" ? "Sandbox" : "Produção"}</span></div><p>{gatewayStatuses[gateway.status] ?? gateway.status}</p></> : <p>Configuração não retornada pela API.</p>}
      <strong>Configurar provedor →</strong>
    </Link>;
  })}</div>;
}
