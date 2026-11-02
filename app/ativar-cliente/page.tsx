"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import styles from "@/components/bookings/public-booking.module.css";
export default function ActivateCustomer() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);
  const captured = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    queueMicrotask(() => setToken(value));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function activate(form: HTMLFormElement) {
    const data = new FormData(form); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/public/booking/activate`, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email: data.get("email"), password: data.get("password"), termsAccepted: data.get("terms") === "on" }) });
      if (!response.ok) throw new Error(response.status === 429 ? "Muitas tentativas. Aguarde antes de tentar novamente." : "Não foi possível ativar. Confira o convite, o e-mail e a senha. Se necessário, solicite um novo convite ao estabelecimento.");
      setToken(""); setActivated(true); form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível ativar o acesso."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}><div className={styles.content}><section className={styles.panel} style={{ maxWidth: 540, margin: "32px auto" }}><h1>{activated ? "Acesso ativado" : "Ative sua área do cliente"}</h1>{activated ? <><p>Seu cadastro está pronto. Entre para acompanhar seus agendamentos.</p><Link className={styles.primary} href="/">Entrar na minha conta</Link></> : <><p>Use o e-mail informado ao estabelecimento. Se você já tem uma conta Kalend, informe sua senha atual; caso contrário, escolha uma senha para seu novo acesso.</p>{error && <p className={styles.error} role="alert">{error}</p>}{!token ? <p role="status">Abra o link de convite fornecido pelo estabelecimento para continuar.</p> : <form className={styles.form} onSubmit={event => { event.preventDefault(); void activate(event.currentTarget); }}><label>E-mail<input type="email" name="email" required maxLength={254} autoComplete="email" /></label><label>Senha<input type="password" name="password" minLength={8} maxLength={72} required autoComplete="current-password" /></label><label className={styles.checkbox}><input type="checkbox" name="terms" required />Aceito os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</label><button className={styles.primary} disabled={busy}>{busy ? "Ativando…" : "Ativar meu acesso"}</button></form>}</>}</section></div></main>;
}
