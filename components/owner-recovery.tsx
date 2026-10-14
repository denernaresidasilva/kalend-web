"use client";
import { useState } from "react";
import type { AuthMe, Regularization } from "@/lib/contracts";
import { Button } from "./ui/button";
import { RegularizationPanel } from "./regularization-panel";
import { TrialExpiredModal } from "./trial-expired-modal";

export function OwnerRecovery({ profile, data, error }: { profile: AuthMe; data: Regularization; error?: string }) {
  const [account, setAccount] = useState(false);
  const expired = data.trial.expired || data.accessStatus === "TRIAL_EXPIRED";
  return <main className="kalend-ui k-owner-recovery" aria-label="Regularização do painel do proprietário">
    <header className="k-owner-recovery-heading">
      <div><h1>{expired ? "Seu teste gratuito terminou" : "Regularize sua assinatura"}</h1><p>Escolha um plano para continuar usando o Kalend.</p></div>
      <Button variant="secondary" onClick={() => setAccount(true)}>Minha conta</Button>
    </header>
    {error && <p role="alert">{error}</p>}
    <RegularizationPanel companyId={profile.selectedCompanyId!} state={data} recovery compactRecovery />
    {account && <TrialExpiredModal profile={profile} data={data} accountOnly onBack={() => setAccount(false)} />}
  </main>;
}
