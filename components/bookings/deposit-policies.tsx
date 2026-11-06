"use client";
import { useEffect, useState } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
type Catalog = {
  services: Array<{ id: string; name: string; priceCents: number }>;
  professionals: Array<{
    id: string;
    displayName: string;
    services: Array<{ serviceId: string }>;
  }>;
};
type Policies = {
  canCollect: boolean;
  policies: Array<{
    id: string;
    service: { name: string };
    professional: { displayName: string } | null;
    percentBps: number | null;
    fixedCents: number | null;
  }>;
};
export function DepositPolicies({
  companyId,
  userId,
}: {
  companyId: string;
  userId: string;
}) {
  const [data, setData] = useState<Policies | null>(null),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [service, setService] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [quote, setQuote] = useState<{
      depositCents: number;
      balanceCents: number;
    } | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([
      tenantApi<Policies>(
        companyId,
        "/booking/deposit-policies",
        undefined,
        userId,
      ),
      tenantApi<Catalog>(companyId, "/operations/catalog", undefined, userId),
    ])
      .then(([p, c]) => {
        if (live) {
          setData(p);
          setCatalog(c);
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Falha ao carregar.");
      });
    return () => {
      live = false;
    };
  }, [companyId, userId]);
  const money = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n / 100);
  return (
    <Card>
      <details>
        <summary>Agenda · Sinal antecipado</summary>
        <p>
          A cobrança do sinal depende de um gateway do estabelecimento
          homologado. As regras abaixo são rascunhos: salvar não cria cobrança,
          não bloqueia a agenda e não registra pagamento. O sinal confirmado
          será considerado no saldo do atendimento quando a integração
          financeira estiver disponível.
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        {catalog && (
          <form
            className="k-ops-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                const r = await tenantApi<{ quote: NonNullable<typeof quote> }>(
                  companyId,
                  "/booking/deposit-policies",
                  {
                    method: "POST",
                    ...jsonBody({
                      enabled: false,
                      serviceId: service,
                      professionalId: f.get("professional") || undefined,
                      ...(f.get("type") === "fixed"
                        ? {
                            fixedCents: Math.round(
                              Number(f.get("value")) * 100,
                            ),
                          }
                        : {
                            percentBps: Math.round(
                              Number(f.get("value")) * 100,
                            ),
                          }),
                    }),
                  },
                  userId,
                );
                setQuote(r.quote);
                setData(
                  await tenantApi(
                    companyId,
                    "/booking/deposit-policies",
                    undefined,
                    userId,
                  ),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Falha ao salvar.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Serviço do sinal
              <select
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {catalog.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {money(s.priceCents)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Profissional do sinal
              <select name="professional" key={service}>
                <option value="">Regra padrão do serviço</option>
                {catalog.professionals
                  .filter((p) =>
                    p.services.some((s) => s.serviceId === service),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Tipo do sinal
              <select name="type">
                <option value="fixed">Valor fixo em reais</option>
                <option value="percent">Percentual do serviço</option>
              </select>
            </label>
            <label>
              Valor ou percentual
              <input
                required
                name="value"
                type="number"
                min={0.01}
                step={0.01}
              />
            </label>
            <button disabled={busy} className="k-button-secondary">
              Salvar rascunho do sinal
            </button>
          </form>
        )}
        {quote && (
          <p>
            Sinal previsto: {money(quote.depositCents)} · saldo previsto:{" "}
            {money(quote.balanceCents)}. Sem cobrança ou confirmação financeira.
          </p>
        )}
        {data?.policies.map((p) => (
          <p key={p.id}>
            {p.service.name} · {p.professional?.displayName ?? "Padrão"} ·{" "}
            {p.fixedCents !== null
              ? money(p.fixedCents)
              : `${(p.percentBps ?? 0) / 100}%`}{" "}
            · Rascunho
          </p>
        ))}
      </details>
    </Card>
  );
}
