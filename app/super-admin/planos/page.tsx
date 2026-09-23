"use client";

import { API_URL } from "@/lib/api";

import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Crown,
  Edit3,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Users,
  WalletCards,
  Webhook,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Feature = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
};

type Plan = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number | null;
  trialEnabled: boolean;
  trialDays: number;
  badge: string | null;
  isFeatured: boolean;
  displayOrder: number;
  maxProfessionals: number | null;
  maxClients: number | null;
  maxUnits: number | null;
  isActive: boolean;
  features: Feature[];
};

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/super-admin",
  },
  {
    label: "Empresas",
    icon: Building2,
    path: "/super-admin/empresas",
  },
  {
    label: "Planos",
    icon: CreditCard,
    path: "/super-admin/planos",
  },
  {
    label: "Assinaturas",
    icon: WalletCards,
    path: "/super-admin/assinaturas",
  },
  {
    label: "Financeiro",
    icon: CircleDollarSign,
    path: "/super-admin/financeiro",
  },
  {
    label: "Webhooks",
    icon: Webhook,
    path: "/super-admin/webhooks",
  },
  {
    label: "Usuários",
    icon: Users,
    path: "/super-admin/usuarios",
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function PlansPage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  };

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/plans/public`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Não foi possível carregar os planos.");
        }

        const data = await response.json();
        setPlans(data);
      } catch {
        setError(
          "Não foi possível carregar os planos. Tente novamente."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <CalendarDays size={22} />
            <span>K</span>
          </div>

          <strong>Kalend</strong>

          <button
            className="sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="admin-badge">SUPER ADMIN</div>

        <nav className="admin-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`admin-nav-item ${
                  item.path === "/super-admin/planos"
                    ? "active"
                    : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <button
            className="admin-nav-item"
            onClick={() =>
              navigate("/super-admin/configuracoes")
            }
          >
            <Settings size={19} />
            <span>Configurações</span>
          </button>

          <div className="admin-profile">
            <div className="admin-avatar">DN</div>

            <div>
              <strong>Administrador</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <section className="admin-content">
        <header className="admin-topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={23} />
          </button>

          <div className="mobile-admin-logo">
            <div className="mobile-admin-mark">K</div>
            <strong>Kalend</strong>
          </div>

          <div className="admin-top-actions">
            <button
              className="notification-button"
              aria-label="Notificações"
            >
              <Bell size={20} />
              <span />
            </button>

            <div className="top-profile">
              <div className="admin-avatar small">DN</div>

              <div>
                <strong>Administrador</strong>
                <span>Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-main plans-admin-main">
          <div className="plans-heading">
            <div>
              <span className="dashboard-eyebrow">
                MONETIZAÇÃO
              </span>

              <h1>Planos</h1>

              <p>
                Gerencie preços, benefícios, limites e períodos
                de teste do Kalend.
              </p>
            </div>

            <button
              className="new-plan-button"
              onClick={() =>
                navigate("/super-admin/planos/novo")
              }
            >
              <Plus size={19} />
              Novo plano
            </button>
          </div>

          <section className="plans-summary">
            <article>
              <div className="plans-summary-icon">
                <CreditCard size={20} />
              </div>

              <div>
                <span>Planos cadastrados</span>
                <strong>{plans.length}</strong>
              </div>
            </article>

            <article>
              <div className="plans-summary-icon">
                <Check size={20} />
              </div>

              <div>
                <span>Planos ativos</span>
                <strong>
                  {plans.filter((plan) => plan.isActive).length}
                </strong>
              </div>
            </article>

            <article>
              <div className="plans-summary-icon">
                <Sparkles size={20} />
              </div>

              <div>
                <span>Com teste grátis</span>
                <strong>
                  {
                    plans.filter(
                      (plan) => plan.trialEnabled
                    ).length
                  }
                </strong>
              </div>
            </article>
          </section>

          {loading && (
            <div className="plans-loading">
              <Loader2 className="plans-spinner" size={30} />
              <strong>Carregando planos...</strong>
              <span>
                Buscando as configurações no Kalend.
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="plans-error">
              <strong>Não foi possível carregar</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="plans-empty">
              <CreditCard size={30} />

              <strong>Nenhum plano cadastrado</strong>

              <p>
                Crie o primeiro plano comercial do Kalend.
              </p>

              <button
                onClick={() =>
                  navigate("/super-admin/planos/novo")
                }
              >
                <Plus size={18} />
                Criar plano
              </button>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <section className="admin-plans-grid">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`admin-plan-card ${
                    plan.isFeatured ? "featured" : ""
                  }`}
                >
                  {plan.isFeatured && (
                    <div className="featured-plan-label">
                      <Crown size={15} />
                      {plan.badge || "Destaque"}
                    </div>
                  )}

                  <div className="admin-plan-card-top">
                    <div>
                      <div className="plan-name-row">
                        <h2>{plan.name}</h2>

                        <span
                          className={`plan-status ${
                            plan.isActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {plan.isActive
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </div>

                      <p>
                        {plan.description ||
                          "Plano Kalend"}
                      </p>
                    </div>

                    <button
                      className="plan-edit-button"
                      onClick={() =>
                        navigate(
                          `/super-admin/planos/${plan.id}`
                        )
                      }
                      aria-label={`Editar ${plan.name}`}
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  <div className="admin-plan-price">
                    <strong>
                      {formatMoney(
                        plan.monthlyPriceCents
                      )}
                    </strong>

                    <span>/mês</span>
                  </div>

                  {plan.yearlyPriceCents && (
                    <div className="plan-yearly-price">
                      Anual:{" "}
                      <strong>
                        {formatMoney(
                          plan.yearlyPriceCents
                        )}
                      </strong>
                    </div>
                  )}

                  <div className="plan-info-chips">
                    {plan.trialEnabled && (
                      <span>
                        <Sparkles size={14} />
                        {plan.trialDays} dias grátis
                      </span>
                    )}

                    <span>
                      <Users size={14} />
                      {plan.maxProfessionals === null
                        ? "Profissionais ilimitados"
                        : `${plan.maxProfessionals} ${
                            plan.maxProfessionals === 1
                              ? "profissional"
                              : "profissionais"
                          }`}
                    </span>

                    <span>
                      <Building2 size={14} />
                      {plan.maxUnits === null
                        ? "Unidades ilimitadas"
                        : `${plan.maxUnits} ${
                            plan.maxUnits === 1
                              ? "unidade"
                              : "unidades"
                          }`}
                    </span>
                  </div>

                  <div className="plan-features">
                    <span className="plan-features-title">
                      Recursos incluídos
                    </span>

                    {plan.features.map((feature) => (
                      <div
                        className="plan-feature-row"
                        key={feature.id}
                      >
                        <div className="plan-feature-check">
                          <Check size={13} />
                        </div>

                        <span>{feature.name}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className={`manage-plan-button ${
                      plan.isFeatured ? "featured" : ""
                    }`}
                    onClick={() =>
                      navigate(
                        `/super-admin/planos/${plan.id}`
                      )
                    }
                  >
                    <Edit3 size={17} />
                    Editar plano
                  </button>
                </article>
              ))}
            </section>
          )}
        </div>

        <nav className="admin-mobile-nav">
          <button
            onClick={() => navigate("/super-admin")}
          >
            <LayoutDashboard size={21} />
            <span>Início</span>
          </button>

          <button
            onClick={() =>
              navigate("/super-admin/empresas")
            }
          >
            <Building2 size={21} />
            <span>Empresas</span>
          </button>

          <button
            className="active"
            onClick={() =>
              navigate("/super-admin/planos")
            }
          >
            <CreditCard size={21} />
            <span>Planos</span>
          </button>

          <button
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
            <span>Menu</span>
          </button>
        </nav>
      </section>
    </main>
  );
}
