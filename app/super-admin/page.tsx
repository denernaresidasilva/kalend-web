"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  TrendingUp,
  Users,
  WalletCards,
  Webhook,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function SuperAdminPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  };

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
                  item.path === "/super-admin" ? "active" : ""
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
            onClick={() => navigate("/super-admin/configuracoes")}
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

        <div className="admin-main">
          <div className="dashboard-heading">
            <div>
              <span className="dashboard-eyebrow">VISÃO GERAL</span>
              <h1>Dashboard</h1>
              <p>Acompanhe o desempenho da plataforma Kalend.</p>
            </div>

            <div className="dashboard-date">
              <CalendarDays size={18} />
              <span>Hoje</span>
            </div>
          </div>

          <section className="metric-grid">
            <article className="metric-card">
              <div className="metric-card-top">
                <div className="metric-icon purple">
                  <Building2 size={21} />
                </div>

                <span className="metric-growth">
                  <TrendingUp size={14} />
                  0%
                </span>
              </div>

              <span className="metric-label">
                Empresas ativas
              </span>

              <strong>0</strong>

              <small>
                Estabelecimentos na plataforma
              </small>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <div className="metric-icon blue">
                  <Users size={21} />
                </div>

                <span className="metric-growth">
                  <TrendingUp size={14} />
                  0%
                </span>
              </div>

              <span className="metric-label">
                Usuários
              </span>

              <strong>0</strong>

              <small>
                Usuários cadastrados
              </small>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <div className="metric-icon green">
                  <WalletCards size={21} />
                </div>

                <span className="metric-growth">
                  <TrendingUp size={14} />
                  0%
                </span>
              </div>

              <span className="metric-label">
                Receita mensal
              </span>

              <strong>R$ 0,00</strong>

              <small>
                Receita recorrente mensal
              </small>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <div className="metric-icon orange">
                  <CreditCard size={21} />
                </div>

                <span className="metric-growth">
                  <TrendingUp size={14} />
                  0%
                </span>
              </div>

              <span className="metric-label">
                Assinaturas ativas
              </span>

              <strong>0</strong>

              <small>
                Empresas com assinatura ativa
              </small>
            </article>
          </section>

          <section className="dashboard-panels">
            <article className="dashboard-panel revenue-panel">
              <div className="panel-heading">
                <div>
                  <h2>Receita da plataforma</h2>
                  <p>Evolução dos últimos meses</p>
                </div>

                <button>
                  Últimos 6 meses
                </button>
              </div>

              <div className="empty-chart">
                <div className="chart-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <p>
                  Os dados financeiros aparecerão aqui.
                </p>
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h2>Empresas recentes</h2>
                  <p>Últimos cadastros</p>
                </div>

                <button
                  className="see-all"
                  onClick={() =>
                    navigate("/super-admin/empresas")
                  }
                >
                  Ver todas
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="empty-state">
                <div className="empty-state-icon">
                  <Building2 size={25} />
                </div>

                <strong>
                  Nenhuma empresa ainda
                </strong>

                <p>
                  As novas empresas cadastradas aparecerão aqui.
                </p>
              </div>
            </article>
          </section>

          <section className="dashboard-panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Atividade recente</h2>

                <p>
                  Últimos eventos importantes da plataforma
                </p>
              </div>
            </div>

            <div className="empty-activity">
              <div className="activity-dot" />

              <div>
                <strong>
                  Kalend está pronto
                </strong>

                <p>
                  As atividades da plataforma serão exibidas aqui.
                </p>
              </div>
            </div>
          </section>
        </div>

        <nav className="admin-mobile-nav">
          <button
            className="active"
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
