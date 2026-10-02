"use client";
import { KalendLogo } from "@/components/kalend-logo";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import type { PublicPlan } from "@/lib/contracts";
import type { BillingInterval } from "@/lib/plan-presentation";
import { PlanCatalog } from "./plan-catalog";
import { PlanFaq } from "./plan-faq";
import { ThemeControl } from "@/components/theme/theme-control";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
export function PublicPlans() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      if (!API_URL) throw new Error("Catálogo indisponível no momento.");
      // Truly public request: no session refresh, cookies or authentication required.
      const response = await fetch(`${API_URL}/plans/public`, { credentials: "omit", cache: "no-store", signal });
      if (!response.ok) throw new Error("Não foi possível carregar o catálogo de planos.");
      const data: PublicPlan[] = await response.json();
      if (!Array.isArray(data)) throw new Error("Catálogo indisponível no momento.");
      if (!signal?.aborted) setPlans(data.filter(plan => plan.isActive && plan.isPublic));
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : "Não foi possível carregar o catálogo."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal),0); const refresh = () => void load(controller.signal); window.addEventListener("focus", refresh); return () => { controller.abort(); clearTimeout(timer); window.removeEventListener("focus",refresh); }; }, [load]);
  return <div className="kalend-ui k-plans-public"><header className="k-public-header"><Link href="/" aria-label="Kalend · Entrar"><KalendLogo /></Link><div className="k-actions"><ThemeControl /><Link href="/">Entrar</Link></div></header><main className="k-plans-container"><section className="k-plans-hero"><span className="k-eyebrow">PLANOS KALEND</span><h1>Escolha o próximo passo para o seu negócio.</h1><p>Compare os recursos, os limites e os preços disponíveis. Encontre o plano adequado à sua empresa.</p><a href="#catalogo" className="k-link-button">Explorar planos</a></section><section className="k-plan-benefits" aria-label="Escolha com clareza"><div><h2>Recursos transparentes</h2><p>Veja o que está incluído em cada plano.</p></div><div><h2>Limites à vista</h2><p>Compare profissionais, clientes, unidades e mensagens.</p></div><div><h2>Seu ritmo de cobrança</h2><p>Consulte as opções mensal e anual disponíveis no catálogo.</p></div></section><div className="k-actions"><h2>Planos disponíveis</h2><Button variant="secondary" loading={loading} onClick={() => void load()}>Atualizar catálogo</Button></div>{loading ? <Skeleton label="Carregando planos…" /> : error ? <Alert tone="danger">{error}</Alert> : <PlanCatalog plans={plans} interval={interval} onInterval={setInterval} />}<PlanFaq /><section className="k-plans-final"><h2>Um plano que acompanha suas necessidades.</h2><p>Confira os recursos e escolha com clareza.</p><Link href="/conta/planos" className="k-link-button">Escolher meu plano</Link></section></main></div>;
}
