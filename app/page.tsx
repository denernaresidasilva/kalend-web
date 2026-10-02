"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { KalendLogo } from "@/components/kalend-logo";
import { ThemeControl } from "@/components/theme/theme-control";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { CompanySelector } from "@/components/company-selector";
import { linkedCompanies, prepareLogin, selectCompany } from "@/lib/company-selection";
import type { AuthMe } from "@/lib/contracts";
import { loginDestination } from "@/lib/commercial-navigation";
import { api, ApiError, jsonBody, sessionStarted } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { reload } = useAuth();
  const [selection, setSelection] = useState<AuthMe | null>(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true); setError("");
    try {
      await api("/auth/login", { method: "POST", ...jsonBody({ email: data.get("email"), password: data.get("password") }) });
      form.reset();
      sessionStarted();
      const me = await reload();
      if (!me) throw new Error("Não foi possível verificar a sessão. Tente entrar novamente.");
      if (linkedCompanies(me).length > 1) { setSelection(me); return; }
      // Retain the authenticated state if context selection fails: retry without logging in again.
      setSelection(me);
      const prepared = await prepareLogin(me);
      if (linkedCompanies(me).length === 1) {
        const refreshed = await reload();
        if (!refreshed || refreshed.user.id !== prepared.user.id || refreshed.selectedCompanyId !== prepared.selectedCompanyId) {
          throw new Error("Não foi possível confirmar a empresa na sessão. Tente novamente.");
        }
      }
      router.replace(await loginDestination(prepared));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "E-mail ou senha inválidos." : err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally { (form.elements.namedItem("password") as HTMLInputElement).value = ""; setLoading(false); }

  }

  async function chooseCompany(companyId: string) {
    if (!selection || loading) return;
    setLoading(true); setError("");
    try {
      const selected = await selectCompany(selection, companyId);
      const refreshed = await reload();
      if (!refreshed || refreshed.user.id !== selected.user.id || refreshed.selectedCompanyId !== companyId) {
        throw new Error("Não foi possível confirmar a sessão. Atualize e tente novamente.");
      }
      router.replace(await loginDestination(refreshed));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível selecionar a empresa."); }
    finally { setLoading(false); }
  }

  return (
    <main className="kalend-ui login-page">
      <section className="login-brand">
        <div className="brand-content">
          <KalendLogo />

          <div className="brand-message">
            <span className="brand-pill">GESTÃO INTELIGENTE</span>

            <h1>
              Seu negócio.
              <br />
              <strong>Organizado.</strong>
            </h1>

            <p>
              Agenda, clientes, equipe e gestão em um único lugar.
            </p>
          </div>

          <div className="brand-footer">
            © 2026 Kalend
          </div>
        </div>
      </section>

      <section className="login-area"><div className="k-login-theme"><ThemeControl /></div>
        <div className="mobile-logo">
          <KalendLogo />
        </div>

        <div className="login-card">
          <div className="login-heading">
            <span className="login-eyebrow">BEM-VINDO</span>

            <h2>{selection ? "Acesso à sua conta" : "Entre na sua conta"}</h2>

            <p>
              Acesse o Kalend para continuar.
            </p>
          </div>

          {selection ? <>
            {error && <p className="new-company-message error" role="alert">{error}</p>}
            {linkedCompanies(selection).length > 1 ? <CompanySelector profile={selection} busy={loading} select={chooseCompany} /> : linkedCompanies(selection).length === 1 ? <button type="button" className="login-button" disabled={loading} onClick={() => void chooseCompany(linkedCompanies(selection)[0].company.id)}>{loading ? "Selecionando empresa…" : "Tentar acessar a empresa"}</button> : <p>Nenhuma empresa vinculada à sua conta.</p>}
          </> : <form onSubmit={handleSubmit}>
            {error && <p className="new-company-message error" role="alert">{error}</p>}
            <label htmlFor="email">E-mail</label>

            <div className="input-wrapper">
              <Mail size={19} />

              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="password-label">
              <label htmlFor="password">Senha</label>


            </div>

            <div className="input-wrapper">
              <LockKeyhole size={19} />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? "Entrando..." : "Entrar"}</span>

              {!loading && <ArrowRight size={19} />}
            </button>
          </form>}


        </div>

        <div className="mobile-footer">
          © 2026 Kalend
        </div>
      </section>
    </main>
  );
}
