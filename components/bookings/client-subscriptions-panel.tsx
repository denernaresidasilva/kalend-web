"use client";
import { useEffect, useState } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { money } from "@/lib/money";
type Enrollment = {
  id: string;
  status: string;
  suspensionReason: string | null;
  nextRenewalAt: string;
  company: { timezone: string };
  customer: { name: string };
  definition: {
    name: string;
    cycleMonths: number;
    discountBps: number;
    loyaltyBonusPoints: number;
    terms: string;
    product: { priceCents: number };
  };
  cycles: Array<{
    id: string;
    ordinal: number;
    startsAt: string;
    endsAt: string;
    status: string;
    paidAt: string | null;
  }>;
  events: Array<{ type: string; reason: string; createdAt: string }>;
};
const labels: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
  PAID: "Pago",
  DUE: "Aguardando renovação manual",
  REFUND_REVIEW: "Revisão após estorno",
  SUSPEND: "Suspensão",
  RESUME: "Reativação",
  CANCEL: "Cancelamento",
  MANUAL_RENEWAL_PAID: "Ciclo pago",
  MANUAL_RENEWAL_DUE: "Renovação pendente",
};
export function ClientSubscriptionsPanel({
  companyId,
  userId,
  own = false,
  manager = false,
  revision = 0,
}: {
  companyId: string;
  userId: string;
  own?: boolean;
  manager?: boolean;
  revision?: number;
}) {
  const [rows, setRows] = useState<Enrollment[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    void tenantApi<Enrollment[]>(
      companyId,
      "/operations/client-subscriptions" + (own ? "/mine" : ""),
      undefined,
      userId,
    )
      .then((r) => {
        if (live) {
          setRows(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar clubes.",
          );
      });
    return () => {
      live = false;
    };
  }, [companyId, userId, own, revision, refresh]);
  async function change(id: string, action: string, reason: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await tenantApi(
        companyId,
        "/operations/client-subscriptions/" +
          id +
          (own ? "/cancel" : "/change"),
        {
          method: "POST",
          ...jsonBody({
            ...(!own ? { action } : {}),
            reason,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
        userId,
      );
      setRefresh((n) => n + 1);
      setNotice(
        "Alteração registrada. O histórico de pagamentos permanece disponível.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível alterar o clube.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <details className="k-package-settings">
        <summary>Clubes e renovações dos clientes</summary>
        <p>
          Renovação manual no PDV. Nenhuma cobrança recorrente externa será
          feita. Um ciclo antecipado fica disponível somente no período
          correspondente.
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {rows.length === 0 && <p>Nenhum clube encontrado.</p>}
        {rows.map((r) => {
          const date = (v: string) =>
            new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: r.company.timezone,
            }).format(new Date(v));
          return (
            <article key={r.id} className="k-package-wallet">
              <h3>{r.definition.name}</h3>
              <p>
                {r.customer.name} · {labels[r.status] ?? r.status}
                {r.suspensionReason === "OVERDUE"
                  ? " · período pago encerrado"
                  : ""}
              </p>
              <p>
                Renovação no PDV: {money(r.definition.product.priceCents)} por{" "}
                {r.definition.cycleMonths} mês(es). Este é o preço atual da
                oferta, não um débito automático.
              </p>
              <p>
                Desconto em serviços: {r.definition.discountBps / 100}% · pontos
                adicionais por atendimento elegível:{" "}
                {r.definition.loyaltyBonusPoints}.
              </p>
              <p>
                Próxima renovação prevista: {date(r.nextRenewalAt)}. Para
                renovar, selecione este clube e cliente em “Pacotes de serviços”
                e conclua o pagamento da comanda.
              </p>
              <p>{r.definition.terms}</p>
              <details>
                <summary>Períodos e histórico</summary>
                {r.cycles.map((c) => (
                  <p key={c.id}>
                    Ciclo {c.ordinal}: {date(c.startsAt)} até {date(c.endsAt)} ·{" "}
                    {labels[c.status] ?? c.status}
                    {c.paidAt ? " · pagamento em " + date(c.paidAt) : ""}
                  </p>
                ))}
                {r.events.map((e, i) => (
                  <p key={i}>
                    {date(e.createdAt)} · {labels[e.type] ?? e.type} ·{" "}
                    {e.reason}
                  </p>
                ))}
              </details>
              {(manager || own) && (
                <form
                  className="k-ops-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void change(
                      r.id,
                      own ? "CANCEL" : String(f.get("action")),
                      String(f.get("reason")),
                    );
                  }}
                >
                  {!own && (
                    <label>
                      Ação no clube
                      <select name="action">
                        <option value="SUSPEND">Suspender benefícios</option>
                        <option value="RESUME">
                          Reativar período pago vigente
                        </option>
                        <option value="CANCEL">Cancelar renovação</option>
                      </select>
                    </label>
                  )}
                  <label>
                    Motivo da alteração
                    <input name="reason" required maxLength={1000} />
                  </label>
                  <p>
                    O cancelamento encerra renovações; o período já pago
                    continua válido até o vencimento. Estornos são tratados
                    separadamente no PDV. A suspensão interrompe benefícios até
                    reativação.
                  </p>
                  <button
                    className="k-button-secondary"
                    disabled={busy || (own && r.status === "CANCELLED")}
                  >
                    {own
                      ? "Cancelar renovação do clube"
                      : "Registrar alteração do clube"}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </details>
    </Card>
  );
}
