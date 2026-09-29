"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { parseCommercialIssue, type CommercialIssue } from "@/lib/commercial-errors";
const resources = { professionals: "profissionais", clients: "clientes", units: "unidades", messages: "mensagens" };
export function PlanLimitNotice({ issue, canManage = false }: { issue: CommercialIssue; canManage?: boolean }) {
  return <div className="commercial-notice" role="alert"><h2>{issue.code === "PLAN_LIMIT_REACHED" ? "Limite do plano atingido" : issue.code === "SUBSCRIPTION_REQUIRED" ? "Regularize sua assinatura" : "Recurso indisponível no plano"}</h2>
    {issue.feature && <p>Recurso: {resources[issue.feature]}.</p>}
    {issue.current !== undefined && <p>Uso atual: {issue.current}.</p>}{issue.limit !== undefined && <p>Limite: {issue.limit}.</p>}
    {issue.upgradeRequired && <p>É necessário um plano que atenda a esse uso.</p>}
    {canManage ? <Link href="/conta">Ver assinatura e planos</Link> : <p>Entre em contato com o responsável pela assinatura da empresa.</p>}
  </div>;
}
export function CommercialNotice() {
  const { profile } = useAuth();
  const [issue, setIssue] = useState<CommercialIssue | null>(null);
  useEffect(() => {
    const receive = (event: Event) => setIssue(parseCommercialIssue((event as CustomEvent).detail) ?? null);
    const clear = () => setIssue(null);
    window.addEventListener("kalend:commercial-issue", receive);
    window.addEventListener("kalend:session-ended", clear);
    window.addEventListener("kalend:tenant-changed", clear);
    return () => { window.removeEventListener("kalend:commercial-issue", receive); window.removeEventListener("kalend:session-ended", clear); window.removeEventListener("kalend:tenant-changed", clear); };
  }, []);
  if (!profile || !issue) return null;
  const canManage = profile.memberships.some(m => m.company.id === profile.selectedCompanyId && ["OWNER", "ADMIN"].includes(m.role));
  return <aside className="commercial-global-notice"><PlanLimitNotice issue={issue} canManage={canManage} /><button onClick={() => setIssue(null)} aria-label="Fechar aviso comercial">Fechar</button></aside>;
}
