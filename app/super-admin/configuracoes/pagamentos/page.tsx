"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/components/admin-section";
import { GatewayCards } from "@/components/gateway-cards";
import { api } from "@/lib/api";
import type { Gateway } from "@/lib/contracts";
export default function PaymentsSettings() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setGateways(await api<Gateway[]>("/payment-gateways")); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <AdminSection><main className="commercial-page"><header className="commercial-heading"><div><p>CONFIGURAÇÕES</p><h1>Pagamentos</h1><p>Gerencie os provedores e acompanhe a configuração de cada integração.</p></div><button onClick={() => void load()} disabled={loading}>Atualizar</button></header>
    {loading ? <div className="commercial-skeleton" role="status">Carregando gateways…</div> : error ? <div role="alert" className="commercial-notice"><p>{error}</p><button onClick={() => void load()}>Tentar novamente</button></div> : <GatewayCards gateways={gateways} />}
  </main></AdminSection>;
}
