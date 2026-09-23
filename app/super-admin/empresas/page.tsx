"use client";

import {
  Building2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  Webhook,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Company = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  owner: {
    id: string;
    name: string | null;
    email: string;
  } | null;

  usersCount: number;

  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;

    plan: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
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
    icon: WalletCards,
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function companyStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIAL: "Em teste",
    SUSPENDED: "Suspensa",
    INACTIVE: "Inativa",
    CANCELED: "Cancelada",
  };

  return labels[status] ?? status;
}

function subscriptionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    TRIALING: "Teste grátis",
    ACTIVE: "Ativa",
    PAST_DUE: "Pagamento pendente",
    CANCELED: "Cancelada",
    EXPIRED: "Expirada",
    INCOMPLETE: "Incompleta",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "TRIAL" ||
    normalized === "TRIALING"
  ) {
    return "success";
  }

  if (
    normalized === "PAST_DUE" ||
    normalized === "SUSPENDED"
  ) {
    return "warning";
  }

  if (
    normalized === "CANCELED" ||
    normalized === "EXPIRED" ||
    normalized === "INACTIVE"
  ) {
    return "danger";
  }

  return "neutral";
}

export default function CompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "https://api.kalend.tech/companies",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Não foi possível carregar as empresas."
          );
        }

        const data: Company[] = await response.json();

        setCompanies(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as empresas."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return companies;

    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(term) ||
        company.slug.toLowerCase().includes(term) ||
        company.owner?.name
          ?.toLowerCase()
          .includes(term) ||
        company.owner?.email
          ?.toLowerCase()
          .includes(term) ||
        company.subscription?.plan?.name
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [companies, search]);

  const activeCompanies = companies.filter(
    (company) => company.status === "ACTIVE"
  ).length;

  const trialCompanies = companies.filter(
    (company) =>
      company.status === "TRIAL" ||
      company.subscription?.status === "TRIALING"
  ).length;

  const payingCompanies = companies.filter(
    (company) =>
      company.subscription?.status === "ACTIVE"
  ).length;

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
                  item.href === "/super-admin/empresas"
                    ? "active"
                    : ""
                }
                onClick={() => router.push(item.href)}
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
          <div className="companies-topbar-actions">
            <div>
              <span className="dashboard-eyebrow">
                GESTÃO DA PLATAFORMA
              </span>

              <h1>Empresas</h1>

              <p>
                Acompanhe estabelecimentos, planos,
                assinaturas e responsáveis.
              </p>
            </div>

            <Link
              href="/super-admin/empresas/nova"
              className="companies-new-button"
            >
              <Plus size={18} aria-hidden="true" />
              Nova empresa
            </Link>
          </div>
        </header>

        <div className="companies-content">
          <section className="companies-summary">
            <article>
              <div className="companies-summary-icon">
                <Building2 size={19} />
              </div>

              <div>
                <span>Empresas cadastradas</span>
                <strong>{companies.length}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon green">
                <Building2 size={19} />
              </div>

              <div>
                <span>Empresas ativas</span>
                <strong>{activeCompanies}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon purple">
                <CreditCard size={19} />
              </div>

              <div>
                <span>Em teste grátis</span>
                <strong>{trialCompanies}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon blue">
                <WalletCards size={19} />
              </div>

              <div>
                <span>Assinaturas ativas</span>
                <strong>{payingCompanies}</strong>
              </div>
            </article>
          </section>

          <section className="companies-panel">
            <div className="companies-panel-header">
              <div>
                <h2>Todos os estabelecimentos</h2>
                <p>
                  Empresas cadastradas na plataforma
                  Kalend.
                </p>
              </div>

              <div className="companies-search">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
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
                  Carregando empresas...
                </strong>
              </div>
            )}

            {!loading && error && (
              <div className="companies-state error">
                <Building2 size={29} />

                <strong>
                  Não foi possível carregar
                </strong>

                <span>{error}</span>
              </div>
            )}

            {!loading &&
              !error &&
              companies.length === 0 && (
                <div className="companies-state">
                  <div className="companies-empty-icon">
                    <Building2 size={27} />
                  </div>

                  <strong>
                    Nenhuma empresa cadastrada
                  </strong>

                  <span>
                    Quando uma empresa criar uma conta
                    ou iniciar um teste grátis, ela
                    aparecerá automaticamente aqui.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              companies.length > 0 &&
              filteredCompanies.length === 0 && (
                <div className="companies-state">
                  <Search size={27} />

                  <strong>
                    Nenhum resultado encontrado
                  </strong>

                  <span>
                    Tente pesquisar por outro nome,
                    e-mail ou plano.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              filteredCompanies.length > 0 && (
                <div className="companies-table-wrap">
                  <table className="companies-table">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Responsável</th>
                        <th>Plano</th>
                        <th>Assinatura</th>
                        <th>Usuários</th>
                        <th>Cadastro</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCompanies.map(
                        (company) => (
                          <tr key={company.id}>
                            <td>
                              <div className="company-name-cell">
                                <div>
                                  <Building2
                                    size={17}
                                  />
                                </div>

                                <span>
                                  <strong>
                                    {company.name}
                                  </strong>

                                  <small>
                                    {company.slug}
                                    .kalend.tech
                                  </small>

                                  <em
                                    className={`company-status ${statusClass(
                                      company.status
                                    )}`}
                                  >
                                    {companyStatusLabel(
                                      company.status
                                    )}
                                  </em>
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="company-owner">
                                <strong>
                                  {company.owner
                                    ?.name ||
                                    "Sem responsável"}
                                </strong>

                                <span>
                                  {company.owner
                                    ?.email || "—"}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="company-plan">
                                {company.subscription
                                  ?.plan?.name ||
                                  "Sem plano"}
                              </span>
                            </td>

                            <td>
                              {company.subscription ? (
                                <div className="company-subscription">
                                  <span
                                    className={`company-status ${statusClass(
                                      company.subscription
                                        .status
                                    )}`}
                                  >
                                    {subscriptionStatusLabel(
                                      company.subscription
                                        .status
                                    )}
                                  </span>

                                  {company.subscription
                                    .status ===
                                    "TRIALING" &&
                                    company.subscription
                                      .trialEndsAt && (
                                      <small>
                                        até{" "}
                                        {formatDate(
                                          company
                                            .subscription
                                            .trialEndsAt
                                        )}
                                      </small>
                                    )}
                                </div>
                              ) : (
                                <span className="company-muted">
                                  Sem assinatura
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="company-users-count">
                                <Users size={15} />
                                {company.usersCount}
                              </div>
                            </td>

                            <td>
                              <span className="company-date">
                                {formatDate(
                                  company.createdAt
                                )}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="company-open-button"
                                title="Ver empresa"
                                onClick={() =>
                                  router.push(
                                    `/super-admin/empresas/${company.id}`
                                  )
                                }
                              >
                                <ChevronRight
                                  size={18}
                                />
                              </button>
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
          className="active"
        >
          <Building2 size={19} />
          <span>Empresas</span>
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/super-admin/planos")
          }
        >
          <CreditCard size={19} />
          <span>Planos</span>
        </button>

        <button type="button">
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </main>
  );
}
