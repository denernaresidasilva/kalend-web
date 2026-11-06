"use client";
import { useEffect, useState, useRef } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { money } from "@/lib/money";
type Gift = {
  id: string;
  recipient: { name: string };
  sourceSaleId: string;
  message: string;
  suffix: string;
  faceCents: number;
  balanceCents: number;
  status: string;
  expiresAt: string | null;
  company: { timezone: string };
  movements: Array<{
    type: string;
    deltaCents: number;
    balanceAfterCents: number;
    reason: string;
    createdAt: string;
  }>;
};
function GiftCardsContent({
  companyId,
  userId,
  own = false,
  revision = 0,
}: {
  companyId: string;
  userId: string;
  own?: boolean;
  revision?: number;
}) {
  const saleKey = useRef<{ hash: string; key: string } | null>(null);
  const [cards, setCards] = useState<Gift[]>([]),
    [customers, setCustomers] = useState<Array<{ id: string; name: string }>>(
      [],
    ),
    [entitled, setEntitled] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [codes, setCodes] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    void Promise.all([
      tenantApi<Gift[]>(
        companyId,
        "/operations/gift-cards" + (own ? "/mine" : ""),
        undefined,
        userId,
      ),
      own
        ? Promise.resolve([])
        : tenantApi<Array<{ id: string; name: string }>>(
            companyId,
            "/booking/customers",
            undefined,
            userId,
          ),
      own
        ? Promise.resolve({ entitled: false })
        : tenantApi<{ entitled: boolean }>(
            companyId,
            "/operations/gift-cards/status",
            undefined,
            userId,
          ),
    ])
      .then(([rows, people, status]) => {
        if (live) {
          setCards(rows);
          setCustomers(people);
          setEntitled(status.entitled);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Falha ao carregar cartões-presente.",
          );
      });
    return () => {
      live = false;
    };
  }, [companyId, userId, own, revision, refresh]);
  async function post(path: string, body: unknown = {}) {
    return tenantApi(
      companyId,
      "/operations/gift-cards/" + path,
      { method: "POST", ...jsonBody(body) },
      userId,
    );
  }
  return (
    <Card>
      <details className="k-package-settings">
        <summary>
          {own ? "Meus cartões-presente" : "Cartões-presente digitais"}
        </summary>
        <p>
          Saldo liberado somente após pagamento e finalização no PDV. Uso
          parcial em serviços do destinatário identificado; não serve para
          comprar outros créditos. Estorno de resgate devolve saldo ao cartão,
          sem saque ou prorrogação da validade.
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {!own &&
          (!entitled ? (
            <Alert tone="warning">
              O plano atual não inclui cartões-presente. O histórico permanece
              disponível.
            </Alert>
          ) : (
            <form
              className="k-ops-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                const body = {
                    customerId: f.get("customer"),
                    recipientId: f.get("recipient"),
                    amountCents: Math.round(Number(f.get("value")) * 100),
                    validityDays: Number(f.get("validity")),
                    message: f.get("message") || undefined,
                  },
                  hash = JSON.stringify(body);
                if (saleKey.current?.hash !== hash)
                  saleKey.current = { hash, key: crypto.randomUUID() };
                void post("sales", {
                  ...body,
                  idempotencyKey: saleKey.current.key,
                })
                  .then(() => {
                    saleKey.current = null;
                    setNotice(
                      "Comanda do cartão aberta. Confira o pagamento e finalize no PDV para liberar o saldo.",
                    );
                    setRefresh((n) => n + 1);
                  })
                  .catch((e) =>
                    setError(
                      e instanceof Error ? e.message : "Falha na venda.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <label>
                Comprador do cartão
                <select name="customer" required defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destinatário do cartão
                <select name="recipient" required defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor do cartão (R$)
                <input
                  name="value"
                  type="number"
                  required
                  min={0.01}
                  max={1000000}
                  step={0.01}
                />
              </label>
              <label>
                Validade após pagamento (dias)
                <input
                  name="validity"
                  type="number"
                  required
                  min={1}
                  max={3650}
                  defaultValue={365}
                />
              </label>
              <label>
                Mensagem de presente
                <textarea name="message" maxLength={1000} />
              </label>
              <button className="k-button-primary" disabled={busy}>
                Abrir venda do cartão no PDV
              </button>
            </form>
          ))}
        {cards.length === 0 && <p>Nenhum cartão-presente encontrado.</p>}
        {cards.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt) <= new Date(),
            active = c.status === "ACTIVE" && !expired && c.balanceCents > 0;
          return (
            <article
              className="k-package-wallet"
              key={c.id}
              data-gift-card-id={c.id}
            >
              <h3>Cartão-presente · {c.suffix}</h3>
              <p>
                Destinatário: {c.recipient.name} ·{" "}
                {expired
                  ? "Expirado"
                  : (
                      {
                        ACTIVE: "Ativo",
                        PENDING: "Aguardando pagamento e finalização",
                        CANCELLED: "Cancelado",
                      } as Record<string, string>
                    )[c.status]}
              </p>
              <p>
                Valor original: {money(c.faceCents)} · saldo restante:{" "}
                <strong>{money(c.balanceCents)}</strong>.
              </p>
              {c.expiresAt && (
                <p>
                  Válido até{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: c.company.timezone,
                  }).format(new Date(c.expiresAt))}
                  .
                </p>
              )}
              <p>{c.message}</p>
              {active && (
                <button
                  className="k-button-secondary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setError("");
                    void post(c.id + "/code")
                      .then((r) =>
                        setCodes((v) => ({
                          ...v,
                          [c.id]: (r as { code: string }).code,
                        })),
                      )
                      .catch((e) =>
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Não foi possível exibir código.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Exibir código para resgate
                </button>
              )}
              {active && codes[c.id] && (
                <div>
                  <p>
                    Mostre somente ao estabelecimento ao utilizar. Este código
                    não deve ser publicado.
                  </p>
                  <code style={{ overflowWrap: "anywhere" }}>
                    {codes[c.id]}
                  </code>
                  <button
                    className="k-button-secondary"
                    onClick={() =>
                      setCodes((v) => {
                        const copy = { ...v };
                        delete copy[c.id];
                        return copy;
                      })
                    }
                  >
                    Ocultar código
                  </button>
                </div>
              )}
              <details>
                <summary>Movimentações do cartão</summary>
                {c.movements.map((m, i) => (
                  <p key={i}>
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeZone: c.company.timezone,
                    }).format(new Date(m.createdAt))}{" "}
                    ·{" "}
                    {
                      (
                        {
                          CREDIT: "Crédito após pagamento",
                          REDEEM: "Resgate",
                          RESTORE: "Saldo restaurado",
                          SOURCE_REFUND: "Estorno da compra",
                        } as Record<string, string>
                      )[m.type]
                    }{" "}
                    · {money(m.deltaCents)} · saldo {money(m.balanceAfterCents)}{" "}
                    · {m.reason}
                  </p>
                ))}
              </details>
            </article>
          );
        })}
      </details>
    </Card>
  );
}
export function GiftCardRedemption({
  remaining,
  disabled,
  redeem,
}: {
  remaining: number;
  disabled: boolean;
  redeem: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  return (
    <details className="k-package-settings">
      <summary>Resgatar cartão-presente</summary>
      <form
        className="k-ops-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void redeem({
            code: f.get("code"),
            amountCents: Math.round(Number(f.get("amount")) * 100),
          });
        }}
      >
        <p>
          Somente serviços do destinatário identificado. O saldo será debitado
          agora; finalizar exige concluir os serviços. Estorno deste resgate
          devolve saldo ao cartão, sem devolver dinheiro.
        </p>
        <label>
          Código do cartão-presente
          <input
            name="code"
            autoComplete="off"
            type="password"
            minLength={32}
            maxLength={32}
            required
          />
        </label>
        <label>
          Valor a resgatar (R$)
          <input
            name="amount"
            type="number"
            min={0.01}
            max={remaining / 100}
            step={0.01}
            required
            defaultValue={remaining / 100}
          />
        </label>
        <button className="k-button-primary" disabled={disabled}>
          Utilizar saldo do cartão
        </button>
      </form>
    </details>
  );
}

export function GiftCardsPanel(props: {
  companyId: string;
  userId: string;
  own?: boolean;
  revision?: number;
}) {
  return (
    <GiftCardsContent key={`${props.companyId}:${props.userId}`} {...props} />
  );
}
