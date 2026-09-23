"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  WalletCards,
  Webhook,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardSummary from "@/components/dashboard-summary";
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

          <DashboardSummary />
        </div>
      </section>
    </main>
  );
}
