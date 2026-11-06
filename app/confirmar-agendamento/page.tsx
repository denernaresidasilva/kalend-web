"use client";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
type Details = {
  expiresAt: string;
  response: string | null;
  used: boolean;
  items: Array<{
    serviceName: string;
    startsAt: string;
    professional: { displayName: string };
  }>;
};
export default function ConfirmationPage() {
  const [token] = useState(() =>
      typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("token") ?? ""),
    ),
    [details, setDetails] = useState<Details | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [response, setResponse] = useState(""),
    [bookingUrl, setBookingUrl] = useState("");
  useEffect(() => {
    const value = token;
    history.replaceState(null, "", "/confirmar-agendamento");
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
      const timer = setTimeout(() => setError("Link inválido ou expirado."), 0);
      return () => clearTimeout(timer);
    }
    let live = true;
    void fetch(`${API_URL}/public/booking-confirmation/view`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: value }),
    })
      .then(async (r) => {
        if (!r.ok)
          throw Error("Link inválido, expirado ou agendamento encerrado.");
        return r.json();
      })
      .then((d) => {
        if (live) setDetails(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [token]);
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/public/booking-confirmation/respond`, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      if (!r.ok)
        throw Error(
          "Não foi possível registrar a ação. O link pode ter expirado ou o agendamento ter sido alterado. Entre em contato com o estabelecimento.",
        );
      const result = await r.json();
      setResponse(result.response);
      if (
        typeof result.bookingUrl === "string" &&
        /^\/agendar\/[a-z0-9-]+$/.test(result.bookingUrl)
      )
        setBookingUrl(result.bookingUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className="kalend-ui k-ops-page"
      style={{
        maxWidth: 720,
        margin: "auto",
        padding: "max(24px, env(safe-area-inset-top)) 20px",
      }}
    >
      <h1>Confirmação do atendimento</h1>
      {error && <Alert tone="danger">{error}</Alert>}
      {details && (
        <Card>
          {details.items.map((i, index) => (
            <p key={index}>
              <strong>{i.serviceName}</strong> · {i.professional.displayName} ·{" "}
              {new Date(i.startsAt).toLocaleString("pt-BR")}
            </p>
          ))}
          {response ? (
            <p role="status">
              {response === "CONFIRM"
                ? "Presença confirmada."
                : response === "CANCEL"
                  ? "Agendamento cancelado."
                  : "Pedido de reagendamento enviado ao estabelecimento. O horário atual continua confirmado até a alteração ser combinada."}
            </p>
          ) : details.used || details.response ? (
            <p>
              Este link já foi respondido. Para alterar o atendimento, entre em
              contato com o estabelecimento.
            </p>
          ) : (
            <>
              <p>
                Prazo para responder:{" "}
                {new Date(details.expiresAt).toLocaleString("pt-BR")}.
              </p>
              <div className="k-ops-days">
                <button
                  className="k-button-primary"
                  disabled={busy}
                  onClick={() => void act("CONFIRM")}
                >
                  Confirmar presença
                </button>
                <button
                  className="k-button-secondary"
                  disabled={busy}
                  onClick={() => void act("RESCHEDULE")}
                >
                  Reagendar
                </button>
                <button
                  className="k-button-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Cancelar este agendamento?"))
                      void act("CANCEL");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
          {bookingUrl && (
            <p>
              <a href={bookingUrl}>Consultar a agenda pública</a>
            </p>
          )}
        </Card>
      )}
      {!details && !error && <p role="status">Consultando o agendamento…</p>}
    </main>
  );
}
