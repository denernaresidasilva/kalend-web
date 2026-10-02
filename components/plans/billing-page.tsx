"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { billingMembership } from "@/lib/commercial-navigation";
import { RegularizationPanel } from "@/components/regularization-panel";
import { ThemeControl } from "@/components/theme/theme-control";
import { Loading } from "@/components/ui/loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export function BillingPage({ recovery = false }: { recovery?: boolean }) {
  const { profile, loading, error, reload } = useAuth();
  if (loading) return <main className="kalend-ui k-plans-container"><Loading>Verificando sessão…</Loading></main>;
  if (error) return <main className="kalend-ui k-plans-container"><Alert tone="danger">{error}</Alert><Button onClick={() => void reload()}>Tentar novamente</Button></main>;
  if (!profile) return <main className="kalend-ui k-plans-container"><h1>Entre para escolher seu plano</h1><p>Após entrar, selecione a empresa que deseja gerenciar.</p><Link className="k-link-button" href="/">Entrar</Link><Link href="/planos">Consultar catálogo público</Link></main>;
  const membership = billingMembership(profile);
  return <div className="kalend-ui k-billing-page"><header className="k-public-header"><Link href="/conta">Minha conta / Selecionar empresa</Link><ThemeControl /></header><main className="k-plans-container">{membership ? <><section className="k-plans-hero"><span className="k-eyebrow">{membership.company.name}</span><h1>{recovery ? "Regularize sua assinatura." : "Escolha o plano para o próximo passo."}</h1><p>Compare o catálogo disponível para sua empresa e continue pelo fluxo de pagamento existente.</p><a href="#billing-options" className="k-link-button">{recovery ? "Ver opções de regularização" : "Explorar planos"}</a></section><div id="billing-options"><RegularizationPanel key={`${profile.user.id}:${membership.company.id}`} companyId={membership.company.id} /></div></> : <><h1>Gestão da assinatura</h1><p>{profile.selectedCompanyId ? "A gestão de planos está disponível ao proprietário ou administrador da empresa." : "Selecione uma empresa vinculada à sua conta para continuar."}</p><Link href="/conta">Ir para minha conta</Link><Link href="/planos">Consultar catálogo público</Link></>}</main></div>;
}
