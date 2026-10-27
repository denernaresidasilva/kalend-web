"use client";

import Link from "next/link";
import { apiFetch } from "@/lib/api";

import { Building2, CalendarDays, CreditCard, Loader2, Search, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Subscription = {
  id: string;
  status: string;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;

  company: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };

  plan: {
    id: string;
    name: string;
    code: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number | null;
  };

  lastPayment: {
    id: string;
    status: string;
    amountCents: number;
    createdAt: string;
  } | null;
};


function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    TRIALING: "Teste grátis",
    PENDING: "Pendente",
    SUSPENDED: "Suspensa",
    ACTIVE: "Ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    EXPIRED: "Expirada",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "TRIALING") return "trial";

  if (
    status === "PAST_DUE"
  ) {
    return "warning";
  }

  if (
    status === "CANCELED" ||
    status === "EXPIRED"
  ) {
    return "danger";
  }

  return "neutral";
}

export default function SubscriptionsPage() {

  const [subscriptions, setSubscriptions] = useState<
    Subscription[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch(
          `/subscriptions`,
          {
            cache: "no-store",
          }
        );

        const data: Subscription[] =
          await response.json();

        setSubscriptions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as assinaturas."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSubscriptions();
  }, [attempt]);

  const filteredSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return subscriptions;

    return subscriptions.filter((subscription) => {
      return (
        subscription.company.name
          .toLowerCase()
          .includes(term) ||
        subscription.company.slug
          .toLowerCase()
          .includes(term) ||
        subscription.plan.name
          .toLowerCase()
          .includes(term) ||
        statusLabel(subscription.status)
          .toLowerCase()
          .includes(term)
      );
    });
  }, [subscriptions, search]);

  const activeCount = subscriptions.filter(
    (item) => item.status === "ACTIVE"
  ).length;

  const trialCount = subscriptions.filter(
    (item) => item.status === "TRIALING"
  ).length;

  const attentionCount = subscriptions.filter(
    (item) =>
      item.status === "PAST_DUE"
  ).length;

  return (
    <main className="subscriptions-admin-page">

      <section className="companies-main">
        <header className="companies-topbar">
          <div>
            <span className="dashboard-eyebrow">
              RECEITA E RECORRÊNCIA
            </span>

            <h1>Assinaturas</h1><button type="button" className="new-company-submit" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{error ? "Tentar novamente" : "Atualizar"}</button>

            <p>
              Acompanhe testes grátis, assinaturas
              ativas e cobranças das empresas.
            </p>
          </div>
        </header>

        <div className="companies-content">
          {!loading && !error && (
          <section className="companies-summary">
            <article>
              <div className="companies-summary-icon green">
                <CreditCard size={19} />
              </div>

              <div>
                <span>Assinaturas ativas</span>
                <strong>{activeCount}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon purple">
                <CalendarDays size={19} />
              </div>

              <div>
                <span>Em teste grátis</span>
                <strong>{trialCount}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon">
                <WalletCards size={19} />
              </div>

              <div>
                <span>Total de assinaturas</span>
                <strong className="subscription-money">
                  {subscriptions.length}
                </strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon blue">
                <WalletCards size={19} />
              </div>

              <div>
                <span>Precisam de atenção</span>
                <strong>{attentionCount}</strong>
              </div>
            </article>
          </section>
          )}

          <section className="companies-panel">
            <div className="companies-panel-header">
              <div>
                <h2>Todas as assinaturas</h2>
                <p>
                  Histórico comercial das empresas
                  cadastradas.
                </p>
              </div>

              <div className="companies-search">
                <Search size={17} />

                <input
                  type="text"
                  aria-label="Buscar assinatura" placeholder="Buscar assinatura..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            {loading && (
              <div className="companies-state" role="status">
                <Loader2
                  size={25}
                  className="plans-spinner"
                />

                <strong>
                  Carregando assinaturas...
                </strong>
              </div>
            )}

            {!loading && error && (
              <div className="companies-state error" role="alert">
                <CreditCard size={29} />
                <strong>Erro ao carregar</strong>
                <span>{error}</span>
              </div>
            )}

            {!loading &&
              !error &&
              subscriptions.length === 0 && (
                <div className="companies-state" role="status">
                  <div className="companies-empty-icon">
                    <CreditCard size={27} />
                  </div>

                  <strong>
                    Nenhuma assinatura cadastrada
                  </strong>

                  <span>
                    Quando uma empresa iniciar um teste
                    grátis ou contratar um plano, a
                    assinatura aparecerá
                    automaticamente aqui.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              subscriptions.length > 0 &&
              filteredSubscriptions.length === 0 && (
                <div className="companies-state" role="status">
                  <Search size={27} />

                  <strong>
                    Nenhuma assinatura encontrada
                  </strong>

                  <span>
                    Tente pesquisar por empresa, plano
                    ou status.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              filteredSubscriptions.length > 0 && (
                <div className="companies-table-wrap" role="region" aria-label="Tabela de assinaturas" tabIndex={0}>
                  <table className="companies-table subscriptions-table">
                    <thead>
                      <tr>
                        <th scope="col">Empresa</th>
                        <th scope="col">Plano</th>
                        <th scope="col">Status</th>
                        <th scope="col">Período</th>
                        <th scope="col">Preço mensal do catálogo</th>
                        <th scope="col">Último pagamento</th>
                        <th scope="col">Cadastro</th><th scope="col">Detalhes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSubscriptions.map(
                        (subscription) => (
                          <tr key={subscription.id}>
                            <td>
                              <div className="company-name-cell">
                                <div>
                                  <Building2
                                    size={17}
                                  />
                                </div>

                                <span>
                                  <strong>
                                    {
                                      subscription
                                        .company.name
                                    }
                                  </strong>

                                  <small>
                                    {
                                      subscription
                                        .company.slug
                                    }
                                    .kalend.tech
                                  </small>
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="company-plan">
                                {
                                  subscription.plan
                                    .name
                                }
                              </span>
                            </td>

                            <td>
                              <span
                                className={`subscription-status ${statusClass(
                                  subscription.status
                                )}`}
                              >
                                {statusLabel(
                                  subscription.status
                                )}
                              </span>

                              {subscription.status ===
                                "TRIALING" &&
                                subscription.trialEndsAt && (
                                  <small className="subscription-date-note">
                                    até{" "}
                                    {formatDate(
                                      subscription.trialEndsAt
                                    )}
                                  </small>
                                )}
                            </td>

                            <td>
                              <div className="subscription-period">
                                <span>
                                  {formatDate(
                                    subscription.currentPeriodStart
                                  )}
                                </span>

                                <small>até</small>

                                <span>
                                  {formatDate(
                                    subscription.currentPeriodEnd
                                  )}
                                </span>
                              </div>
                            </td>

                            <td>
                              <strong className="subscription-value">
                                {formatMoney(
                                  subscription.plan
                                    .monthlyPriceCents
                                )}
                              </strong>

                              <small className="subscription-date-note">
                                / mês
                              </small>
                            </td>

                            <td>
                              {subscription.lastPayment ? (
                                <div className="subscription-payment">
                                  <strong>
                                    {formatMoney(
                                      subscription
                                        .lastPayment
                                        .amountCents
                                    )}
                                  </strong>

                                  <small>
                                    {formatDate(
                                      subscription
                                        .lastPayment
                                        .createdAt
                                    )}
                                  </small>
                                </div>
                              ) : (
                                <span className="company-muted">
                                  Sem pagamento
                                </span>
                              )}
                            </td>

                            <td>
                              <span className="company-date">
                                {formatDate(
                                  subscription.createdAt
                                )}
                              </span>
                            </td>
                            <td><Link href={`/super-admin/assinaturas/${subscription.id}`}>Ver detalhes</Link></td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        </div>
      </section>
    </main>
  );
}
