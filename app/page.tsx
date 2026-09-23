"use client";

import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError, jsonBody, sessionStarted } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { reload } = useAuth();
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
      if (me?.systemRole === "SUPER_ADMIN") router.replace("/super-admin");
      else if (me) router.replace("/super-admin");
      else setError("Não foi possível verificar a sessão. Tente entrar novamente.");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "E-mail ou senha inválidos." : err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally { (form.elements.namedItem("password") as HTMLInputElement).value = ""; setLoading(false); }

  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-content">
          <div className="brand-logo">
            <CalendarDays size={27} strokeWidth={2.2} />
            <span>K</span>
          </div>

          <div className="brand-name">Kalend</div>

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

      <section className="login-area">
        <div className="mobile-logo">
          <div className="brand-logo small">
            <CalendarDays size={23} />
            <span>K</span>
          </div>
          <strong>Kalend</strong>
        </div>

        <div className="login-card">
          <div className="login-heading">
            <span className="login-eyebrow">BEM-VINDO</span>

            <h2>Entre na sua conta</h2>

            <p>
              Acesse o Super Admin para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
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
          </form>


        </div>

        <div className="mobile-footer">
          © 2026 Kalend
        </div>
      </section>
    </main>
  );
}
