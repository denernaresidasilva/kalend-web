"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { money } from "@/lib/money";
export type PackageWallet = {
  id: string;
  customer: { id: string; name: string };
  definition: {
    name: string;
    terms: string;
    kind?: string;
    discountBps?: number;
    loyaltyBonusPoints?: number;
  };
  validFrom?: string | null;
  status: string;
  expiresAt: string;
  originalCents: number;
  fundedCents: number;
  recoveryCents: number;
  available: number;
  reserved: number;
  consumed: number;
  usable: boolean;
  sessions: Array<{
    id: string;
    serviceId: string;
    state: string;
    valueCents: number;
    eligibleProfessionalIds: string[];
    service: { name: string };
  }>;
  movements: Array<{
    id: string;
    type: string;
    units: number;
    reason: string;
    createdAt: string;
  }>;
};
type Definition = {
  id: string;
  name: string;
  description: string;
  validityDays: number;
  terms: string;
  active: boolean;
  kind?: string;
  cycleMonths?: number | null;
  discountBps?: number;
  loyaltyBonusPoints?: number;
  product: { id: string; priceCents: number };
  services: Array<{
    serviceId: string;
    sessions: number;
    service: { name: string };
    professionals: Array<{ professionalId: string }>;
  }>;
};
type Catalog = {
  services: Array<{ id: string; name: string }>;
  professionals: Array<{
    id: string;
    displayName: string;
    services: Array<{ serviceId: string }>;
  }>;
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  EXPIRED: "Expirado",
  SCHEDULED: "Período futuro já pago",
  PAUSED: "Benefícios suspensos",
  SUSPENDED: "Suspenso por estorno para revisão",
  CANCELLED: "Cancelado",
};
function WalletCard({ wallet: w }: { wallet: PackageWallet }) {
  return (
    <article className="k-package-wallet">
      <h3>{w.definition.name}</h3>
      <p>
        {w.customer.name} · {statusLabels[w.status]} · validade{" "}
        {new Date(w.expiresAt).toLocaleString("pt-BR")}
      </p>
      <p>
        Sessões disponíveis: <strong>{w.available}</strong> · Selecionadas em
        comanda: {w.reserved} · Consumidas: {w.consumed}
      </p>
      <p>
        Valor da compra: {money(w.originalCents)} · líquido após estornos:{" "}
        {money(w.fundedCents)}.
      </p>
      {!w.usable && (
        <p>
          Uso indisponível por suspensão, cancelamento ou validade. O histórico
          permanece preservado.
        </p>
      )}
      {w.recoveryCents > 0 && (
        <p>
          Valor consumido que exige revisão após estorno:{" "}
          {money(w.recoveryCents)}. Nenhuma cobrança automática é criada.
        </p>
      )}
      {w.definition.kind === "CLUB" && (
        <p>
          Benefícios do clube: {(w.definition.discountBps ?? 0) / 100}% em
          serviços e {w.definition.loyaltyBonusPoints ?? 0} ponto(s)
          adicional(is) por atendimento elegível. Renovação manual no PDV.
        </p>
      )}
      {w.validFrom && new Date(w.validFrom) > new Date() && (
        <p>
          Período futuro: disponível a partir de{" "}
          {new Date(w.validFrom).toLocaleString("pt-BR")}.
        </p>
      )}
      <p>{w.definition.terms}</p>
      <details>
        <summary>Histórico do pacote</summary>
        {w.movements.map((m) => (
          <p key={m.id}>
            {new Date(m.createdAt).toLocaleString("pt-BR")} ·{" "}
            {
              (
                {
                  GRANT: "Crédito após pagamento",
                  RESERVE: "Sessão selecionada",
                  CONSUME: "Atendimento concluído",
                  RELEASE: "Seleção liberada",
                  RESTORE: "Sessão restaurada",
                  REFUND_SUSPEND: "Uso suspenso por estorno",
                } as Record<string, string>
              )[m.type]
            }{" "}
            · {m.reason}
          </p>
        ))}
      </details>
    </article>
  );
}
export function PackagesPanel({
  companyId,
  userId,
  manager,
  revision,
}: {
  companyId: string;
  userId: string;
  manager: boolean;
  revision: number;
}) {
  const [definitions, setDefinitions] = useState<Definition[]>([]),
    [wallets, setWallets] = useState<PackageWallet[]>([]),
    [customers, setCustomers] = useState<Array<{ id: string; name: string }>>(
      [],
    ),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [entitled, setEntitled] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState([
      { key: 0, serviceId: "", sessions: 1, professionalIds: [] as string[] },
    ]);
  const [kind, setKind] = useState<"PACKAGE" | "CLUB">("PACKAGE"),
    [benefitsOnly, setBenefitsOnly] = useState(false);
  const saleKey = useRef<{ hash: string; key: string } | null>(null),
    nextItem = useRef(1);
  const load = useCallback(async () => {
    const [d, w, c, cat, status] = await Promise.all([
      tenantApi<Definition[]>(
        companyId,
        "/operations/packages/definitions",
        undefined,
        userId,
      ),
      tenantApi<PackageWallet[]>(
        companyId,
        "/operations/packages/wallets",
        undefined,
        userId,
      ),
      tenantApi<Array<{ id: string; name: string }>>(
        companyId,
        "/booking/customers",
        undefined,
        userId,
      ),
      tenantApi<Catalog>(companyId, "/operations/catalog", undefined, userId),
      tenantApi<{ entitled: boolean }>(
        companyId,
        "/operations/packages/status",
        undefined,
        userId,
      ),
    ]);
    return { d, w, c, cat, status };
  }, [companyId, userId]);
  useEffect(() => {
    let live = true;
    void load()
      .then((r) => {
        if (live) {
          setDefinitions(r.d);
          setWallets(r.w);
          setCustomers(r.c);
          setCatalog(r.cat);
          setEntitled(r.status.entitled);
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar pacotes.",
          );
      });
    return () => {
      live = false;
    };
  }, [load, revision]);
  async function save(path: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await tenantApi(
        companyId,
        "/operations/packages/" + path,
        { method: "POST", ...jsonBody(body) },
        userId,
      );
      const r = await load();
      setDefinitions(r.d);
      setWallets(r.w);
      setNotice(
        path === "sales"
          ? "Comanda aberta no PDV. Confira o recebimento e finalize para liberar as sessões."
          : "Operação registrada.",
      );
      saleKey.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <details className="k-package-settings">
        <summary>Pacotes de serviços</summary>
        {error && <Alert tone="danger">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <p>
          A compra libera sessões somente após pagamento e finalização no PDV.
          Selecionar sessão não a consome; o consumo ocorre após atendimento
          concluído e finalização. A receita da compra não é repetida na
          utilização.
        </p>
        {!entitled && (
          <Alert tone="warning">
            O plano atual não inclui o módulo de pacotes. O histórico permanece
            disponível; novas vendas e utilizações exigem direito válido.
          </Alert>
        )}
        {manager && entitled && catalog && (
          <details>
            <summary>Cadastrar pacote</summary>
            <form
              className="k-ops-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save("definitions", {
                  name: f.get("name"),
                  description: f.get("description"),
                  kind,
                  ...(kind === "CLUB"
                    ? {
                        cycleMonths: Number(f.get("months")),
                        discountBps: Math.round(Number(f.get("percent")) * 100),
                        loyaltyBonusPoints: Number(f.get("bonus")),
                        renewalMode: "MANUAL_PDV",
                      }
                    : {}),
                  priceCents: Math.round(Number(f.get("price")) * 100),
                  validityDays:
                    kind === "CLUB" ? 30 : Number(f.get("validity")),
                  terms: f.get("terms"),
                  services:
                    kind === "CLUB" && benefitsOnly
                      ? []
                      : items.map((i) => ({
                          serviceId: i.serviceId,
                          sessions: i.sessions,
                          professionalIds: i.professionalIds,
                        })),
                });
              }}
            >
              <label>
                Tipo da oferta
                <select
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as "PACKAGE" | "CLUB")
                  }
                >
                  <option value="PACKAGE">Pacote de sessões</option>
                  <option value="CLUB">Clube com renovação manual</option>
                </select>
              </label>
              {kind === "CLUB" && (
                <>
                  <p>
                    A renovação é paga no PDV. Não existe cobrança recorrente
                    externa habilitada. Benefícios antecipados ficam disponíveis
                    somente no período correspondente.
                  </p>
                  <label>
                    Duração do ciclo (meses)
                    <input
                      name="months"
                      type="number"
                      min={1}
                      max={12}
                      required
                      defaultValue={1}
                    />
                  </label>
                  <label>
                    Desconto do clube em serviços (%)
                    <input
                      name="percent"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      required
                      defaultValue={0}
                    />
                  </label>
                  <label>
                    Pontos adicionais por atendimento elegível
                    <input
                      name="bonus"
                      type="number"
                      min={0}
                      max={10000}
                      required
                      defaultValue={0}
                    />
                  </label>
                  <div className="k-ops-days">
                    <label>
                      <input
                        type="checkbox"
                        checked={benefitsOnly}
                        onChange={(e) => setBenefitsOnly(e.target.checked)}
                      />
                      Clube sem sessões incluídas, somente descontos ou pontos
                    </label>
                  </div>
                  <p>
                    Descontos não se somam entre clubes; vale o maior benefício
                    vigente. Pontos adicionais respeitam a fidelidade e as
                    condições de atendimento/pagamento.
                  </p>
                </>
              )}
              <label>
                Nome do pacote
                <input name="name" required maxLength={120} />
              </label>
              <label>
                Descrição do pacote
                <textarea name="description" required maxLength={2000} />
              </label>
              <label>
                Preço do pacote (R$)
                <input
                  name="price"
                  type="number"
                  min={0.01}
                  max={1000000}
                  step={0.01}
                  required
                />
              </label>
              <label>
                Validade após compra (dias)
                <input
                  name="validity"
                  disabled={kind === "CLUB"}
                  type="number"
                  min={1}
                  max={3650}
                  required
                  defaultValue={30}
                />
              </label>
              <label>
                Condições de uso e cancelamento
                <textarea name="terms" required maxLength={2000} />
              </label>
              <p>
                Estorno da compra suspende os usos futuros e revisa
                proporcionalmente comissões e pontos. A devolução financeira é
                registrada no PDV. Definições vendidas são preservadas; para
                mudar condições, cadastre uma nova versão.
              </p>
              {!(kind === "CLUB" && benefitsOnly) &&
                items.map((i, index) => (
                  <fieldset key={i.key}>
                    <legend>Serviço {index + 1} do pacote</legend>
                    <label>
                      Serviço do pacote {index + 1}
                      <select
                        required
                        value={i.serviceId}
                        onChange={(e) =>
                          setItems(
                            items.map((v) =>
                              v.key === i.key
                                ? {
                                    ...v,
                                    serviceId: e.target.value,
                                    professionalIds: [],
                                  }
                                : v,
                            ),
                          )
                        }
                      >
                        <option value="" disabled>
                          Selecione
                        </option>
                        {catalog.services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sessões do serviço {index + 1}
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={i.sessions}
                        onChange={(e) =>
                          setItems(
                            items.map((v) =>
                              v.key === i.key
                                ? { ...v, sessions: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <p>
                      Sem profissional marcado: qualquer profissional habilitado
                      neste serviço.
                    </p>
                    <div className="k-ops-days">
                      {catalog.professionals
                        .filter((p) =>
                          p.services.some((s) => s.serviceId === i.serviceId),
                        )
                        .map((p) => (
                          <label key={p.id}>
                            <input
                              type="checkbox"
                              checked={i.professionalIds.includes(p.id)}
                              onChange={(e) =>
                                setItems(
                                  items.map((v) =>
                                    v.key === i.key
                                      ? {
                                          ...v,
                                          professionalIds: e.target.checked
                                            ? [...v.professionalIds, p.id]
                                            : v.professionalIds.filter(
                                                (id) => id !== p.id,
                                              ),
                                        }
                                      : v,
                                  ),
                                )
                              }
                            />
                            {p.displayName}
                          </label>
                        ))}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="k-button-secondary"
                        onClick={() =>
                          setItems(items.filter((v) => v.key !== i.key))
                        }
                      >
                        Remover serviço do pacote {index + 1}
                      </button>
                    )}
                  </fieldset>
                ))}
              <button
                type="button"
                className="k-button-secondary"
                disabled={
                  items.length >= 20 || (kind === "CLUB" && benefitsOnly)
                }
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      key: nextItem.current++,
                      serviceId: "",
                      sessions: 1,
                      professionalIds: [],
                    },
                  ])
                }
              >
                Incluir serviço no pacote
              </button>
              <button className="k-button-primary" disabled={busy}>
                Cadastrar pacote
              </button>
            </form>
          </details>
        )}
        {entitled && (
          <form
            className="k-ops-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                body = {
                  definitionId: f.get("definition"),
                  customerId: f.get("customer"),
                },
                hash = JSON.stringify(body);
              if (saleKey.current?.hash !== hash)
                saleKey.current = { hash, key: crypto.randomUUID() };
              void save("sales", {
                ...body,
                idempotencyKey: saleKey.current!.key,
              });
            }}
          >
            <label>
              Pacote da venda
              <select name="definition" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {definitions
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {money(d.product.priceCents)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Cliente do pacote
              <select name="customer" required defaultValue="">
                <option value="" disabled>
                  Selecione um cliente cadastrado
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="k-button-primary" disabled={busy}>
              Abrir venda do pacote no PDV
            </button>
            <a href="#pdv">Ir às comandas</a>
          </form>
        )}
        <h3>Definições</h3>
        {definitions.map((d) => (
          <article key={d.id}>
            <h4>
              {d.name} · {money(d.product.priceCents)}
            </h4>
            <p>
              {d.services
                .map((s) => `${s.sessions} × ${s.service.name}`)
                .join(" · ")}{" "}
              ·{" "}
              {d.kind === "CLUB"
                ? `${d.cycleMonths} mês(es), renovação manual`
                : `${d.validityDays} dias`}{" "}
              · {d.active ? "Ativo" : "Desativado"}
            </p>
            {manager && d.active && (
              <button
                disabled={busy}
                className="k-button-secondary"
                onClick={() => void save(`definitions/${d.id}/deactivate`, {})}
              >
                Desativar {d.name}
              </button>
            )}
          </article>
        ))}
        <h3>Saldos e histórico</h3>
        {wallets.length ? (
          wallets.map((w) => <WalletCard key={w.id} wallet={w} />)
        ) : (
          <p>Nenhum pacote liberado por pagamento.</p>
        )}
      </details>
    </Card>
  );
}
export function ClientPackages({
  companyId,
  userId,
}: {
  companyId: string;
  userId: string;
}) {
  const [state, setState] = useState<{
      key: string;
      wallets: PackageWallet[];
    } | null>(null),
    [error, setError] = useState(""),
    key = companyId + ":" + userId;
  useEffect(() => {
    let live = true;
    const load = () =>
      tenantApi<PackageWallet[]>(
        companyId,
        "/operations/packages/mine",
        undefined,
        userId,
      )
        .then((wallets) => {
          if (live) setState({ key, wallets });
        })
        .catch((e) => {
          if (live)
            setError(
              e instanceof Error ? e.message : "Falha ao ler seus pacotes.",
            );
        });
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [companyId, userId, key]);
  return (
    <Card>
      <details>
        <summary>Meus pacotes</summary>
        {error && <Alert tone="danger">{error}</Alert>}
        {state?.key === key ? (
          state.wallets.length ? (
            state.wallets.map((w) => <WalletCard key={w.id} wallet={w} />)
          ) : (
            <p>Nenhum pacote adquirido neste estabelecimento.</p>
          )
        ) : (
          <p>Carregando pacotes…</p>
        )}
      </details>
    </Card>
  );
}
export function PackageLineControl({
  companyId,
  userId,
  customerId,
  lineId,
  serviceId,
  professionalId,
  activeUse,
  disabled,
  run,
  post,
}: {
  companyId: string;
  userId: string;
  customerId: string;
  lineId: string;
  serviceId: string;
  professionalId?: string;
  activeUse?: {
    id: string;
    status: string;
    session: { wallet: { definition: { name: string } } };
  };
  disabled: boolean;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
  post: (path: string, body?: unknown) => Promise<unknown>;
}) {
  const [wallets, setWallets] = useState<PackageWallet[] | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    key = useRef<{ sessionId: string; key: string } | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setWallets(
        await tenantApi(
          companyId,
          "/operations/packages/wallets?" + new URLSearchParams({ customerId }),
          undefined,
          userId,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível ler o saldo.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (activeUse)
    return (
      <div>
        <p>
          Pacote: {activeUse.session.wallet.definition.name} ·{" "}
          {activeUse.status === "RESERVED"
            ? "Selecionado; consumo na finalização"
            : "Sessão consumida"}
          .
        </p>
        {activeUse.status === "RESERVED" && (
          <button
            disabled={disabled}
            className="k-button-secondary"
            onClick={() => {
              const reason = window.prompt(
                "Motivo para retirar o pacote e restaurar o preço do serviço:",
              );
              if (reason)
                void run(() =>
                  post(`packages/uses/${activeUse.id}/release`, { reason }),
                );
            }}
          >
            Retirar sessão do pacote
          </button>
        )}
      </div>
    );
  return (
    <details>
      <summary
        onClick={() => {
          if (wallets === null && !loading) void load();
        }}
      >
        Usar sessão de pacote
      </summary>
      {error && <Alert tone="danger">{error}</Alert>}
      {wallets && (
        <form
          className="k-ops-form"
          onSubmit={(e) => {
            e.preventDefault();
            const sessionId = String(
              new FormData(e.currentTarget).get("session"),
            );
            if (key.current?.sessionId !== sessionId)
              key.current = { sessionId, key: crypto.randomUUID() };
            void run(() =>
              post(`packages/lines/${lineId}/reserve`, {
                sessionId,
                idempotencyKey: key.current!.key,
              }),
            );
          }}
        >
          <label>
            Sessão disponível
            <select name="session" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {wallets
                .filter((w) => w.usable)
                .flatMap((w) =>
                  w.sessions
                    .filter(
                      (s) =>
                        s.state === "AVAILABLE" &&
                        s.serviceId === serviceId &&
                        (!s.eligibleProfessionalIds.length ||
                          Boolean(
                            professionalId &&
                            s.eligibleProfessionalIds.includes(professionalId),
                          )),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {w.definition.name} · {s.service.name} · validade{" "}
                        {new Date(w.expiresAt).toLocaleDateString("pt-BR")}
                      </option>
                    )),
                )}
            </select>
          </label>
          <button disabled={disabled} className="k-button-secondary">
            Selecionar sessão do pacote
          </button>
        </form>
      )}
      {loading && <p>Consultando saldo…</p>}
    </details>
  );
}
