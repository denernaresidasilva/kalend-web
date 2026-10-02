import Link from "next/link";
import type { Gateway } from "@/lib/contracts";
import { gatewayNames, gatewayStatuses } from "@/lib/commercial";
import { Badge } from "./ui/badge";
export function GatewayCards({ gateways }: { gateways: Gateway[] }) {
  return <div className="k-gateway-grid">{Object.entries(gatewayNames).map(([key, name]) => {
    const gateway = gateways.find(item => item.gateway === key);
    return <Link className="k-card k-gateway-card" key={key} href={`/super-admin/configuracoes/pagamentos/${key}`}>
      <strong>{name}</strong>
      {gateway ? <><div className="k-actions"><Badge>{gateway.enabled ? "Habilitado" : "Desabilitado"}</Badge><Badge>{gateway.environment === "SANDBOX" ? "Sandbox" : "Produção"}</Badge></div><Badge tone={gateway.status === "CONNECTED" ? "success" : gateway.status === "FAILED" ? "danger" : gateway.status === "PENDING_VALIDATION" ? "warning" : "neutral"}>{gatewayStatuses[gateway.status] ?? gateway.status}</Badge></> : <p>Configuração não retornada pela API.</p>}
      <span>Configurar provedor →</span>
    </Link>;
  })}</div>;
}
