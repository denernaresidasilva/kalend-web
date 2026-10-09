"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { AuthMe, Regularization } from "@/lib/contracts";
import { selectCompany } from "@/lib/company-selection";
import { logoutAllSessions } from "@/lib/account-session";
import { useAuth } from "./auth-provider";
import { RegularizationPanel } from "./regularization-panel";
import { AccountProfile } from "./account-profile";
import { AccountSecurity } from "./account-security";
import { CompanySelector } from "./company-selector";
import { Button } from "./ui/button";

export function TrialExpiredModal({ profile, data, error }: { profile: AuthMe; data: Regularization; error?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { logout, reload } = useAuth();
  const [account, setAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const operation = useRef(false);
  const manages = ["OWNER", "ADMIN"].includes(data.context.role ?? "");
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Native listeners run before the browser's close request, including portal dialogs.
    const cancel = (event: Event) => event.preventDefault();
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); } };
    element?.addEventListener("cancel", cancel);
    element?.addEventListener("keydown", keyboard, true);
    element?.showModal();
    return () => { element?.removeEventListener("cancel", cancel); element?.removeEventListener("keydown", keyboard, true); element?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  async function leave(all = false) {
    if (operation.current || all && !window.confirm("Sair de todos os dispositivos?")) return;
    operation.current = true;
    setBusy(true); setFailure("");
    try { if (all) await logoutAllSessions(); else await logout(); router.replace("/"); }
    catch (err) { setFailure(err instanceof Error ? err.message : "Não foi possível sair."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function select(companyId: string) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setFailure("");
    try { await selectCompany(profile, companyId); await reload(false); }
    catch (err) { setFailure(err instanceof Error ? err.message : "Não foi possível selecionar a empresa."); }
    finally { operation.current = false; setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="kalend-ui k-trial-expired-modal" aria-modal="true" aria-labelledby="trial-expired-title" aria-describedby="trial-expired-description" onCancel={event => event.preventDefault()}>
    <header className="commercial-heading"><div><h2 id="trial-expired-title">Teste gratuito encerrado</h2><p id="trial-expired-description">Escolha um plano para continuar usando sua empresa. O acesso será restaurado após a confirmação do pagamento.</p></div></header>
    {(error || failure) && <p role="alert">{failure || error}</p>}
    <div className="k-actions"><Button variant={account ? "secondary" : "primary"} onClick={() => setAccount(false)}>Escolher plano</Button><Button variant={account ? "primary" : "secondary"} onClick={() => setAccount(true)}>Minha conta</Button><Button variant="ghost" disabled={busy} onClick={() => void leave()}>Sair</Button></div>
    {account ? <><AccountProfile profile={profile} /><AccountSecurity profile={profile} leaving={busy} onLogout={() => void leave()} onLogoutAll={() => void leave(true)} /><CompanySelector profile={profile} busy={busy} select={select} /></> : manages && profile.selectedCompanyId ? <RegularizationPanel companyId={profile.selectedCompanyId} state={data} recovery /> : <p>Solicite ao proprietário ou administrador da empresa a escolha de um plano. Você pode consultar sua conta, trocar de empresa ou sair.</p>}
  </dialog>, document.body);
}
