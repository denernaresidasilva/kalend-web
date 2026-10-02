"use client";

import { apiFetch } from "@/lib/api";

import { Building2, Check, CreditCard, Crown, Edit3, Loader2, Plus, Sparkles, Users } from "lucide-react";
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
  isPublic: boolean;
  maxMessages: number | null;
  isActive: boolean;
  features: Feature[];
};


function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function PlansPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const navigate = (path: string) => {
    router.push(path);
  };

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch(
          `/plans`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();
        setPlans(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Não foi possível carregar os planos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [attempt]);

  return (
    <main className="k-plans-page">

      <section className="admin-content">

        <div className="plans-admin-main">
          <div className="plans-heading">
            <div>
              <span className="dashboard-eyebrow">
                MONETIZAÇÃO
              </span>

              <h1>Planos</h1><button type="button" className="new-company-submit" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{error ? "Tentar novamente" : "Atualizar"}</button>

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

          {!loading && !error && (
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
          )}

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

                  <p>{plan.isPublic ? "Público" : "Privado"} · Mensagens: {plan.maxMessages === null ? "ilimitadas" : plan.maxMessages}</p>
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
      </section>
    </main>
  );
}
