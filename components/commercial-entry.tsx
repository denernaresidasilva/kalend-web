"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { clearCommercialState, getCommercialState } from "@/lib/commercial-state";
import type { Regularization } from "@/lib/contracts";
import { commercialRedirect, trialNotice } from "@/lib/commercial-navigation";
import { accountDestination } from "@/lib/company-selection";
import { Loading } from "./ui/loading";
import { TrialNotice } from "./trial-notice";

export function CommercialEntry({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<{ key: string; data?: Regularization; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastRedirect = useRef("");
  const key = profile ? `${profile.user.id}:${profile.selectedCompanyId}` : "";
  const protectedRoute = pathname === "/planos" || pathname === "/conta" || pathname.startsWith("/conta/");
  const required = protectedRoute && profile?.systemRole !== "SUPER_ADMIN" && !!profile?.selectedCompanyId;
  useEffect(() => {
    const invalidate = () => { clearCommercialState(); setState(null); setAttempt(value => value + 1); };
    const loaded = () => setAttempt(value => value + 1);
    window.addEventListener("kalend:tenant-changed", invalidate);
    window.addEventListener("kalend:session-ended", invalidate);
    window.addEventListener("kalend:signed-in", invalidate);
    window.addEventListener("kalend:commercial-loaded", loaded);
    window.addEventListener("focus", invalidate);
    return () => {
      window.removeEventListener("kalend:tenant-changed", invalidate);
      window.removeEventListener("kalend:session-ended", invalidate);
      window.removeEventListener("kalend:signed-in", invalidate);
      window.removeEventListener("kalend:commercial-loaded", loaded);
      window.removeEventListener("focus", invalidate);
    };
  }, []);
  useEffect(() => {
    if (!required || !profile?.selectedCompanyId) return;
    let alive = true;
    void getCommercialState(profile.selectedCompanyId, profile.user.id).then(data => {
      if (alive) setState({ key, data });
    }).catch(error => { if (alive) setState({ key, error: error instanceof Error ? error.message : "Não foi possível verificar o acesso comercial." }); });
    return () => { alive = false; };
  }, [key, required, profile?.selectedCompanyId, profile?.user.id, attempt]);
  const data = state?.key === key ? state.data : undefined;
  const destination = required && data && profile ? commercialRedirect(data, pathname, accountDestination(profile)) : null;
  useEffect(() => {
    const signature = `${key}:${pathname}:${destination}`;
    if (destination && lastRedirect.current !== signature) { lastRedirect.current = signature; router.replace(destination); }
    if (!destination) lastRedirect.current = "";
  }, [destination, pathname, key, router]);
  if (protectedRoute && loading) return <Loading>Verificando sessão…</Loading>;
  if (!required) return children;
  if (state?.key === key && state.error) return <><section className="commercial-page" aria-label="Verificação comercial indisponível"><p role="alert">{state.error}</p><button onClick={() => { clearCommercialState(); setState(null); setAttempt(value => value + 1); }}>Tentar novamente</button></section>{children}</>;
  if (!data || destination) return <Loading>Verificando acesso comercial…</Loading>;
  const notice = trialNotice(data);
  return <>{children}{notice && pathname === "/conta" && <TrialNotice key={`${key}:${data.trial.endsAt}:${data.trial.remainingDays}`} preferenceKey={`${key}:${data.trial.endsAt}:${data.trial.remainingDays}`} message={notice} />}</>;
}
