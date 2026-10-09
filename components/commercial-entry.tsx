"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { cachedCommercialState, clearCommercialState, commercialRevalidationDelay, getCommercialState } from "@/lib/commercial-state";
import type { Regularization } from "@/lib/contracts";
import { commercialRedirect, trialNotice } from "@/lib/commercial-navigation";
import { accountDestination } from "@/lib/company-selection";
import { Loading } from "./ui/loading";
import { TrialNotice } from "./trial-notice";
import { TrialExpiredModal } from "./trial-expired-modal";

// Recovery screens never grant product access. The API independently enforces deadlines.
export const commercialRecoveryRoutes = ["/conta", "/conta/planos", "/conta/regularizar", "/conta/configuracoes/seguranca", "/planos"];
export function CommercialEntry({ children }: { children: React.ReactNode }) {
  const { profile, loading, reload } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<{ key: string; data?: Regularization; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastRedirect = useRef("");
  const wasBlocked = useRef(false);
  const companyId = profile?.selectedCompanyId;
  const userId = profile?.user.id;
  const key = `${userId}:${companyId}`;
  const required = !!profile && profile.systemRole !== "SUPER_ADMIN" && !!companyId;
  useEffect(() => {
    const invalidate = () => { clearCommercialState(); setState(null); setAttempt(value => value + 1); };
    // Refresh without unmounting an existing recovery modal or its checkout form.
    const refresh = () => setAttempt(value => value + 1);
    const loaded = () => {
      if (!companyId || !userId) return;
      const data = cachedCommercialState(companyId, userId);
      if (data) setState({ key, data });
    };
    for (const name of ["kalend:tenant-changed", "kalend:session-ended", "kalend:signed-in"]) window.addEventListener(name, invalidate);
    window.addEventListener("kalend:commercial-loaded", loaded);
    window.addEventListener("focus", refresh);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      for (const name of ["kalend:tenant-changed", "kalend:session-ended", "kalend:signed-in"]) window.removeEventListener(name, invalidate);
      window.removeEventListener("kalend:commercial-loaded", loaded);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [companyId, userId, key]);
  useEffect(() => {
    if (!required || !companyId || !userId) return;
    let alive = true;
    void getCommercialState(companyId, userId, true).then(data => {
      if (alive) setState({ key, data });
    }).catch(error => {
      if (alive) setState(old => ({ key, data: old?.key === key ? old.data : undefined, error: error instanceof Error ? error.message : "Não foi possível verificar o acesso comercial." }));
    });
    return () => { alive = false; };
  }, [key, required, companyId, userId, pathname, attempt]);
  const data = state?.key === key ? state.data : undefined;
  useEffect(() => {
    if (!required) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), data && !state?.error ? commercialRevalidationDelay(data) : 5000);
    return () => clearTimeout(timer);
  }, [required, data, state?.error, attempt]);
  const expired = !!data && (data.accessStatus === "TRIAL_EXPIRED" || data.trial.expired);
  useEffect(() => {
    if (wasBlocked.current && data?.accessAllowed === true && !expired) void reload(false);
    wasBlocked.current = expired;
  }, [expired, data?.accessAllowed, reload]);
  const destination = required && data && profile ? commercialRedirect(data, pathname, accountDestination(profile)) : null;
  useEffect(() => {
    const signature = `${key}:${pathname}:${destination}`;
    if (destination && lastRedirect.current !== signature) { lastRedirect.current = signature; router.replace(destination); }
    if (!destination) lastRedirect.current = "";
  }, [destination, pathname, key, router]);
  if (loading) return <Loading>Verificando sessão…</Loading>;
  if (!required) return children;
  if (!data) return <section className="commercial-page" aria-label="Verificação comercial">{state?.key === key && state.error ? <><p role="alert">{state.error}</p><button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></> : <Loading>Verificando acesso comercial…</Loading>}</section>;
  if (expired && profile && companyId) return <>
    <main className="commercial-page"><h1>Seu teste gratuito encerrou</h1><p>Regularize a assinatura para continuar usando a empresa.</p></main>
    <TrialExpiredModal key={key} profile={profile} data={data} error={state?.error} />
  </>;
  if (state?.error && !commercialRecoveryRoutes.includes(pathname)) return <section className="commercial-page"><p role="alert">{state.error}</p><button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></section>;
  if (destination) return <Loading>Verificando acesso comercial…</Loading>;
  const notice = trialNotice(data);
  return <>{children}{notice && pathname === "/conta" && <TrialNotice key={`${key}:${data.trial.endsAt}:${data.trial.remainingDays}`} preferenceKey={`${key}:${data.trial.endsAt}:${data.trial.remainingDays}`} message={notice} />}</>;
}
