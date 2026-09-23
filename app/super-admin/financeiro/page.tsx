"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Loader2,
  Menu,
  ReceiptText,
  Search,
  Settings,
  TrendingUp,
  Users,
  Webhook,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  status: string;
  amountCents: number;
  gateway: string | null;
  externalPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;

  company: {
    id: string;
    name: string;
    slug: string;
  } | null;

  plan: {
    id: string;
    name: string;
    code: string;
  } | null;

  subscription: {
    id: string;
    status: string;
  } | null;
};

type FinanceSummary = {
  revenueCents: number;
  monthlyRevenueCents: number;
  paymentsCount: number;
  approvedCount: number;
  pendingCount: number;
  failedCount: number;
};

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/super-admin",
  },
  {
    label: "Empresas",
    icon: Building2,
    href: "/super-admin/empresas",
  },
  {
    label: "Planos",
    icon: CreditCard,
    href: "/super-admin/planos",
  },
  {
    label: "Assinaturas",
    icon: WalletCards,
    href: "/super-admin/assinaturas",
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    href: "/super-admin/financeiro",
  },
  {
    label: "Webhooks",
    icon: Webhook,
    href: "/super-admin/webhooks",
  },
  {
    label: "Usuários",
    icon: Users,
    href: "/super-admin/usuarios",
  },
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    APPROVED: "Aprovado",
    PENDING: "Pendente",
    FAILED: "Falhou",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "APPROVED") {
    return "success";
  }

  if (normalized === "PENDING") {
    return "warning";
  }

  if (
    normalized === "FAILED" ||
    normalized === "CANCELED"
  ) {
    return "danger";
  }

  return "neutral";
}

export default function FinanceiroPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    revenueCents: 0,
    monthlyRevenueCents: 0,
    paymentsCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadFinance() {
      try {
        setLoading(true);
        setError("");

        const [paymentsResponse, summaryResponse] =
          await Promise.all([
            fetch("https://api.kalend.tech/finance", {
              cache: "no-store",
            }),
            fetch(
              "https://api.kalend.tech/finance/summary",
              {
                cache: "no-store",
              }
            ),
          ]);

        if (
          !paymentsResponse.ok ||
          !summaryResponse.ok
        ) {
          throw new Error(
            "Não foi possível carregar os dados financeiros."
          );
        }

        const paymentsData: Payment[] =
          await paymentsResponse.json();

        const summaryData: FinanceSummary =
          await summaryResponse.json();

        setPayments(paymentsData);
        setSummary(summaryData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o financeiro."
        );
      } finally {
        setLoading(false);
      }
    }

    loadFinance();
  }, []);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return payments;

    return payments.filter((payment) => {
      return (
        payment.company?.name
          ?.toLowerCase()
          .includes(term) ||
        payment.company?.slug
          ?.toLowerCase()
          .includes(term) ||
        payment.plan?.name
          ?.toLowerCase()
          .includes(term) ||
        payment.status
          .toLowerCase()
          .includes(term) ||
        payment.gateway
          ?.toLowerCase()
          .includes(term) ||
        payment.externalPaymentId
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [payments, search]);

  return (
    <main className="companies-admin-page">
      <aside className="companies-sidebar">
        <div className="companies-brand">
          <div>K</div>

          <span>
            <strong>Kalend</strong>
            <small>Super Admin</small>
          </span>
        </div>

        <nav className="companies-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                type="button"
                className={
                  item.href ===
                  "/super-admin/financeiro"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  router.push(item.href)
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="companies-settings"
          onClick={() =>
            router.push(
              "/super-admin/configuracoes"
            )
          }
        >
          <Settings size={18} />
          <span>Configurações</span>
        </button>
      </aside>

      <section className="companies-main">
        <header className="companies-topbar">
          <div>
            <span className="dashboard-eyebrow">
              GESTÃO DA PLATAFORMA
            </span>

            <h1>Financeiro</h1>

            <p>
              Acompanhe faturamento, pagamentos e
              movimentações financeiras do Kalend.
            </p>
          </div>
        </header>

        <div className="companies-content">
          <section className="companies-summary">
            <article>
              <div className="companies-summary-icon">
                <DollarSign size={19} />
              </div>

              <div>
                <span>Faturamento total</span>

                <strong>
                  {formatMoney(
                    summary.revenueCents
                  )}
                </strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon green">
                <TrendingUp size={19} />
              </div>

              <div>
                <span>Receita no mês</span>

                <strong>
                  {formatMoney(
                    summary.monthlyRevenueCents
                  )}
                </strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon purple">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <span>Pagamentos aprovados</span>

                <strong>
                  {summary.approvedCount}
                </strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon blue">
                <Clock3 size={19} />
              </div>

              <div>
                <span>Pagamentos pendentes</span>

                <strong>
                  {summary.pendingCount}
                </strong>
              </div>
            </article>
          </section>

          <section className="finance-secondary-stats">
            <div>
              <ReceiptText size={18} />

              <span>
                Total de pagamentos
              </span>

              <strong>
                {summary.paymentsCount}
              </strong>
            </div>

            <div>
              <AlertCircle size={18} />

              <span>
                Falhas / cancelados
              </span>

              <strong>
                {summary.failedCount}
              </strong>
            </div>
          </section>

          <section className="companies-panel">
            <div className="companies-panel-header">
              <div>
                <h2>Pagamentos</h2>

                <p>
                  Histórico financeiro das
                  assinaturas da plataforma.
                </p>
              </div>

              <div className="companies-search">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Buscar pagamento..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            {loading && (
              <div className="companies-state">
                <Loader2
                  size={25}
                  className="plans-spinner"
                />

                <strong>
                  Carregando financeiro...
                </strong>
              </div>
            )}

            {!loading && error && (
              <div className="companies-state error">
                <AlertCircle size={29} />

                <strong>
                  Não foi possível carregar
                </strong>

                <span>{error}</span>
              </div>
            )}

            {!loading &&
              !error &&
              payments.length === 0 && (
                <div className="companies-state">
                  <div className="companies-empty-icon">
                    <ReceiptText size={27} />
                  </div>

                  <strong>
                    Nenhum pagamento encontrado
                  </strong>

                  <span>
                    Quando começarmos a processar
                    cobranças das assinaturas, os
                    pagamentos aparecerão
                    automaticamente aqui.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              payments.length > 0 &&
              filteredPayments.length === 0 && (
                <div className="companies-state">
                  <Search size={27} />

                  <strong>
                    Nenhum resultado encontrado
                  </strong>

                  <span>
                    Tente pesquisar por outra
                    empresa, plano ou pagamento.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              filteredPayments.length > 0 && (
                <div className="companies-table-wrap">
                  <table className="companies-table">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Plano</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Gateway</th>
                        <th>Pagamento</th>
                        <th>Data</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPayments.map(
                        (payment) => (
                          <tr key={payment.id}>
                            <td>
                              <div className="company-owner">
                                <strong>
                                  {payment.company
                                    ?.name ||
                                    "Sem empresa"}
                                </strong>

                                <span>
                                  {payment.company
                                    ?.slug
                                    ? `${payment.company.slug}.kalend.tech`
                                    : "—"}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="company-plan">
                                {payment.plan
                                  ?.name ||
                                  "Sem plano"}
                              </span>
                            </td>

                            <td>
                              <strong>
                                {formatMoney(
                                  payment.amountCents
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`company-status ${statusClass(
                                  payment.status
                                )}`}
                              >
                                {paymentStatusLabel(
                                  payment.status
                                )}
                              </span>
                            </td>

                            <td>
                              <span className="company-muted">
                                {payment.gateway ||
                                  "—"}
                              </span>
                            </td>

                            <td>
                              <span className="company-muted">
                                {payment.externalPaymentId ||
                                  "—"}
                              </span>
                            </td>

                            <td>
                              <span className="company-date">
                                {formatDate(
                                  payment.paidAt ||
                                    payment.createdAt
                                )}
                              </span>
                            </td>
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

      <nav className="companies-mobile-nav">
        <button
          type="button"
          onClick={() =>
            router.push("/super-admin")
          }
        >
          <LayoutDashboard size={19} />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/super-admin/empresas"
            )
          }
        >
          <Building2 size={19} />
          <span>Empresas</span>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/super-admin/planos"
            )
          }
        >
          <CreditCard size={19} />
          <span>Planos</span>
        </button>

        <button
          type="button"
          className="active"
        >
          <DollarSign size={19} />
          <span>Financeiro</span>
        </button>

        <button type="button">
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </main>
  );
}
