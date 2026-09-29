"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/components/admin-section";
import { api } from "@/lib/api";
import type { SubscriptionDetail } from "@/lib/contracts";
import { SubscriptionView } from "@/components/subscription-view";
export default function SubscriptionPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api<SubscriptionDetail | null>(`/subscriptions/${encodeURIComponent(id)}`)); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar a assinatura."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <AdminSection><main className="commercial-page"><Link href="/super-admin/assinaturas">← Assinaturas</Link><button disabled={loading} onClick={() => void load()}>Atualizar</button>{loading ? <div role="status" className="commercial-skeleton">Carregando assinatura…</div> : error ? <p role="alert">{error}</p> : data ? <SubscriptionView data={data} /> : <p>Assinatura não encontrada.</p>}</main></AdminSection>;
}
