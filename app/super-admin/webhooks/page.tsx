"use client";

import { API_URL } from "@/lib/api";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Eye,
  LayoutDashboard,
  Loader2,
  Menu,
  Search,
  Settings,
  Users,
  Webhook,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WebhookEvent = {
  id: string;
  gateway: string;
  externalEventId: string;
  eventType: string | null;
  status: string;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type WebhookSummary = {
  total: number;
  received: number;
  processing: number;
  processed: number;
  failed: number;
  ignored: number;
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

function gatewayLabel(gateway: string) {
  const labels: Record<string, string> = {
    MANUAL: "Manual",
    MERCADO_PAGO: "Mercado Pago",
    STRIPE: "Stripe",
    PAGBANK: "PagBank",
  };

  return labels[gateway] ?? gateway;
}

function webhookStatusLabel(status: string) {
  const labels: Record<string, string> = {
    RECEIVED: "Recebido",
    PROCESSING: "Processando",
    PROCESSED: "Processado",
    FAILED: "Falhou",
    IGNORED: "Ignorado",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "PROCESSED") return "success";

  if (
    status === "RECEIVED" ||
    status === "PROCESSING"
  ) {
    return "warning";
  }

  if (status === "FAILED") return "danger";

  return "neutral";
}

export default function WebhooksPage() {
  const router = useRouter();

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [summary, setSummary] = useState<WebhookSummary>({
    total: 0,
    received: 0,
    processing: 0,
    processed: 0,
    failed: 0,
    ignored: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadWebhooks() {
      try {
        setLoading(true);
        setError("");

        const [eventsResponse, summaryResponse] =
          await Promise.all([
            fetch(`${API_URL}/webhooks`, {
              cache: "no-store",
            }),
            fetch(
              `${API_URL}/webhooks/summary`,
              {
                cache: "no-store",
              }
            ),
          ]);

        if (
          !eventsResponse.ok ||
          !summaryResponse.ok
        ) {
          throw new Error(
            "Não foi possível carregar os webhooks."
          );
        }

        const eventsData: WebhookEvent[] =
          await eventsResponse.json();

        const summaryData: WebhookSummary =
          await summaryResponse.json();

        setEvents(eventsData);
        setSummary(summaryData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os webhooks."
        );
      } finally {
        setLoading(false);
      }
    }

    loadWebhooks();
  }, []);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return events;

    return events.filter((event) => {
      return (
        event.gateway.toLowerCase().includes(term) ||
        event.status.toLowerCase().includes(term) ||
        event.externalEventId
          .toLowerCase()
          .includes(term) ||
        event.eventType
          ?.toLowerCase()
          .includes(term) ||
        event.errorMessage
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [events, search]);

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
                  item.href === "/super-admin/webhooks"
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

            <h1>Webhooks</h1>

            <p>
              Monitore eventos recebidos dos gateways
              e acompanhe o processamento das cobranças.
            </p>
          </div>
        </header>

        <div className="companies-content">
          <section className="companies-summary">
            <article>
              <div className="companies-summary-icon">
                <Webhook size={19} />
              </div>

              <div>
                <span>Eventos recebidos</span>
                <strong>{summary.total}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon green">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <span>Processados</span>
                <strong>{summary.processed}</strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon purple">
                <Clock3 size={19} />
              </div>

              <div>
                <span>Aguardando</span>

                <strong>
                  {summary.received +
                    summary.processing}
                </strong>
              </div>
            </article>

            <article>
              <div className="companies-summary-icon blue">
                <XCircle size={19} />
              </div>

              <div>
                <span>Falhas</span>
                <strong>{summary.failed}</strong>
              </div>
            </article>
          </section>

          <section className="finance-secondary-stats">
            <div>
              <Clock3 size={18} />

              <span>Em processamento</span>

              <strong>
                {summary.processing}
              </strong>
            </div>

            <div>
              <AlertCircle size={18} />

              <span>Eventos ignorados</span>

              <strong>
                {summary.ignored}
              </strong>
            </div>
          </section>

          <section className="companies-panel">
            <div className="companies-panel-header">
              <div>
                <h2>Histórico de eventos</h2>

                <p>
                  Eventos enviados pelos gateways
                  integrados ao Kalend.
                </p>
              </div>

              <div className="companies-search">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Buscar webhook..."
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
                  Carregando webhooks...
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
              events.length === 0 && (
                <div className="companies-state">
                  <div className="companies-empty-icon">
                    <Webhook size={27} />
                  </div>

                  <strong>
                    Nenhum webhook recebido
                  </strong>

                  <span>
                    Quando Mercado Pago, Stripe,
                    PagBank ou outro gateway enviar
                    um evento, ele aparecerá
                    automaticamente aqui.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              events.length > 0 &&
              filteredEvents.length === 0 && (
                <div className="companies-state">
                  <Search size={27} />

                  <strong>
                    Nenhum resultado encontrado
                  </strong>

                  <span>
                    Tente pesquisar por gateway,
                    evento, status ou identificador.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              filteredEvents.length > 0 && (
                <div className="companies-table-wrap">
                  <table className="companies-table">
                    <thead>
                      <tr>
                        <th>Gateway</th>
                        <th>Evento</th>
                        <th>ID externo</th>
                        <th>Status</th>
                        <th>Recebido</th>
                        <th>Processado</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr key={event.id}>
                          <td>
                            <strong>
                              {gatewayLabel(
                                event.gateway
                              )}
                            </strong>
                          </td>

                          <td>
                            <span className="company-plan">
                              {event.eventType ||
                                "Não informado"}
                            </span>
                          </td>

                          <td>
                            <span className="company-muted">
                              {event.externalEventId}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`company-status ${statusClass(
                                event.status
                              )}`}
                            >
                              {webhookStatusLabel(
                                event.status
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="company-date">
                              {formatDate(
                                event.receivedAt
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="company-date">
                              {formatDate(
                                event.processedAt
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="company-open-button"
                              title="Ver webhook"
                              onClick={() =>
                                router.push(
                                  `/super-admin/webhooks/${event.id}`
                                )
                              }
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
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
              "/super-admin/financeiro"
            )
          }
        >
          <DollarSign size={19} />
          <span>Financeiro</span>
        </button>

        <button
          type="button"
          className="active"
        >
          <Webhook size={19} />
          <span>Webhooks</span>
        </button>

        <button type="button">
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </main>
  );
}

