"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/components/admin-section";
import { GatewayForm } from "@/components/gateway-form";
import { api } from "@/lib/api";
import { gatewayNames } from "@/lib/commercial";
import type { Gateway } from "@/lib/contracts";
export default function GatewayPage() {
  const { gateway: id } = useParams<{ gateway: string }>();
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setGateway(null);
    try {
      if (!Object.hasOwn(gatewayNames, id)) throw new Error("Provedor não encontrado.");
      setGateway(await api<Gateway>(`/payment-gateways/${id}`));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar o provedor."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <AdminSection><main className="commercial-page"><Link href="/super-admin/configuracoes/pagamentos">← Todos os provedores</Link><button disabled={loading} onClick={() => void load()}>Atualizar configuração</button>
    {loading ? <div role="status" className="commercial-skeleton">Carregando configuração…</div> : error ? <div role="alert"><p>{error}</p><button onClick={() => void load()}>Tentar novamente</button></div> : gateway && <GatewayForm key={`${id}-${gateway.environment}`} gateway={gateway} saved={setGateway} />}
  </main></AdminSection>;
}
