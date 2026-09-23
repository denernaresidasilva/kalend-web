"use client";

import { apiFetch } from "@/lib/api";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  maxProfessionals: number | null;
  maxClients: number | null;
  maxUnits: number | null;
  isActive: boolean;
};

function hasYearlyPrice(plan: Plan | undefined) {
  return typeof plan?.yearlyPriceCents === "number"
    && Number.isFinite(plan.yearlyPriceCents)
    && plan.yearlyPriceCents > 0;
}

function hasTrial(plan: Plan | undefined) {
  return plan?.trialEnabled === true
    && Number.isInteger(plan.trialDays)
    && plan.trialDays > 0;
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não disponível";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function NewCompanyPage() {
  const router = useRouter();

  const [plansError, setPlansError] = useState("");
  const [plansAttempt, setPlansAttempt] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [companyName, setCompanyName] =
    useState("");

  const [slug, setSlug] = useState("");

  const [timezone, setTimezone] = useState(
    "America/Sao_Paulo",
  );

  const [ownerName, setOwnerName] =
    useState("");

  const [ownerEmail, setOwnerEmail] =
    useState("");

  const [ownerPhone, setOwnerPhone] =
    useState("");

  const [ownerPassword, setOwnerPassword] =
    useState("");

  const [planId, setPlanId] = useState("");

  const [billingInterval, setBillingInterval] =
    useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const [startWithTrial, setStartWithTrial] =
    useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        setPlansError("");

        const response = await apiFetch(
          `/plans/public`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data: Plan[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida ao carregar os planos.");
        }

        const activePlans = data.filter(
          (plan) => plan.isActive,
        );

        setPlans(activePlans);

        if (activePlans.length > 0) {
          setPlanId(activePlans[0].id);
          setStartWithTrial(hasTrial(activePlans[0]));
          setBillingInterval("MONTHLY");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setPlansError(
          err instanceof TypeError
            ? "Não foi possível conectar à API. Verifique a conexão, a URL da API e a permissão CORS para este domínio."
            : err instanceof Error
              ? err.message
              : "Não foi possível carregar os planos.",
        );
      } finally {
        if (!controller.signal.aborted) setLoadingPlans(false);
      }
    }

    loadPlans();
    return () => controller.abort();
  }, [plansAttempt]);

  const selectedPlan = plans.find(
    (plan) => plan.id === planId,
  );

  function selectPlan(plan: Plan) {
    setPlanId(plan.id);
    if (!hasTrial(plan)) setStartWithTrial(false);
    if (!hasYearlyPrice(plan)) setBillingInterval("MONTHLY");
  }

  function handleCompanyName(value: string) {
    setCompanyName(value);

    if (!slug) {
      const generatedSlug = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      setSlug(generatedSlug);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    if (!selectedPlan) {
      setError("Selecione um plano.");
      return;
    }

    if (startWithTrial && !hasTrial(selectedPlan)) {
      setError("Este plano não oferece teste grátis.");
      return;
    }

    if (billingInterval === "YEARLY" && !hasYearlyPrice(selectedPlan)) {
      setError("Este plano não possui preço anual disponível.");
      return;
    }

    if (ownerPassword.length < 8 || new TextEncoder().encode(ownerPassword).length > 72) {
      setError(
        "A senha precisa ter ao menos 8 caracteres e no máximo 72 bytes.",
      );
      return;
    }

    try {
      setSubmitting(true);

      await apiFetch(
        `/companies/manual`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            companyName,
            slug,
            timezone,

            ownerName,
            ownerEmail,
            ownerPhone,
            ownerPassword,

            planId,
            billingInterval,
            startWithTrial,
          }),
        },
      );

      setOwnerPassword("");
      setSuccess(
        "Empresa cadastrada com sucesso.",
      );

      setTimeout(() => {
        router.push("/super-admin/empresas");
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível cadastrar a empresa.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="new-company-page">
      <div className="new-company-container">
        <header className="new-company-header">
          <button
            type="button"
            className="new-company-back"
            onClick={() =>
              router.push("/super-admin/empresas")
            }
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <div>
            <span className="dashboard-eyebrow">
              SUPER ADMIN
            </span>

            <h1>Nova empresa</h1>

            <p>
              Cadastre o estabelecimento, proprietário
              e assinatura inicial.
            </p>
          </div>
        </header>

        <form
          className="new-company-form"
          onSubmit={handleSubmit}
        >
          <section className="new-company-section">
            <div className="new-company-section-title">
              <div>
                <Building2 size={20} />
              </div>

              <span>
                <strong>Dados da empresa</strong>
                <small>
                  Informações do estabelecimento.
                </small>
              </span>
            </div>

            <div className="new-company-grid">
              <label>
                <span>Nome da empresa</span>

                <input
                  type="text"
                  value={companyName}
                  onChange={(event) =>
                    handleCompanyName(
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: Studio Bella"
                  required
                />
              </label>

              <label>
                <span>Subdomínio</span>

                <div className="new-company-slug">
                  <input
                    type="text"
                    value={slug}
                    onChange={(event) =>
                      setSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(
                            /[^a-z0-9-]/g,
                            "",
                          ),
                      )
                    }
                    placeholder="studio-bella"
                    required
                  />

                  <strong>.kalend.tech</strong>
                </div>
              </label>

              <label className="new-company-full">
                <span>Fuso horário</span>

                <select
                  value={timezone}
                  onChange={(event) =>
                    setTimezone(event.target.value)
                  }
                >
                  <option value="America/Sao_Paulo">
                    Brasília / São Paulo
                  </option>

                  <option value="America/Manaus">
                    Manaus
                  </option>

                  <option value="America/Rio_Branco">
                    Rio Branco
                  </option>

                  <option value="America/Fortaleza">
                    Fortaleza
                  </option>

                  <option value="America/Recife">
                    Recife
                  </option>
                </select>
              </label>
            </div>
          </section>

          <section className="new-company-section">
            <div className="new-company-section-title">
              <div>
                <UserRound size={20} />
              </div>

              <span>
                <strong>Proprietário</strong>
                <small>
                  Conta principal da empresa.
                </small>
              </span>
            </div>

            <div className="new-company-grid">
              <label>
                <span>Nome completo</span>

                <input
                  type="text"
                  value={ownerName}
                  onChange={(event) =>
                    setOwnerName(event.target.value)
                  }
                  placeholder="Nome do proprietário"
                  required
                />
              </label>

              <label>
                <span>E-mail</span>

                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(event) =>
                    setOwnerEmail(event.target.value)
                  }
                  placeholder="email@exemplo.com"
                  required
                />
              </label>

              <label>
                <span>Telefone</span>

                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(event) =>
                    setOwnerPhone(event.target.value)
                  }
                  placeholder="(12) 99999-9999"
                />
              </label>

              <label>
                <span>Senha inicial</span>

                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(event) =>
                    setOwnerPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </label>
            </div>
          </section>

          <section className="new-company-section">
            <div className="new-company-section-title">
              <div>
                <CreditCard size={20} />
              </div>

              <span>
                <strong>Plano e assinatura</strong>
                <small>
                  Escolha como a empresa começará.
                </small>
              </span>
            </div>

            {loadingPlans ? (
              <div className="new-company-loading">
                <Loader2
                  size={22}
                  className="plans-spinner"
                />
                Carregando planos...
              </div>
            ) : plansError ? (
              <div className="new-company-alert" role="alert">
                <p>{plansError}</p>
                <button type="button" onClick={() => setPlansAttempt((value) => value + 1)}>
                  Tentar novamente
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="new-company-alert">
                Nenhum plano ativo disponível.
              </div>
            ) : (
              <>
                <div className="new-company-plans">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={
                        planId === plan.id
                          ? "new-company-plan selected"
                          : "new-company-plan"
                      }
                      aria-pressed={planId === plan.id}
                      onClick={() =>
                        selectPlan(plan)
                      }
                    >
                      <span className="new-company-plan-check">
                        {planId === plan.id && (
                          <CheckCircle2 size={18} />
                        )}
                      </span>

                      <strong>{plan.name}</strong>

                      <small>
                        {formatMoney(
                          plan.monthlyPriceCents,
                        )}
                        /mês
                      </small>

                      <small>
                        {hasYearlyPrice(plan)
                          ? `${formatMoney(plan.yearlyPriceCents)}/ano`
                          : "Anual indisponível"}
                      </small>
                      <em>
                        {hasTrial(plan)
                          ? `${plan.trialDays} dias de teste grátis`
                          : "Sem teste grátis"}
                      </em>
                    </button>
                  ))}
                </div>

                <div className="new-company-options">
                  <label>
                    <span>Periodicidade</span>

                    <select
                      value={billingInterval}
                      onChange={(event) =>
                        setBillingInterval(
                          event.target.value as
                            | "MONTHLY"
                            | "YEARLY",
                        )
                      }
                    >
                      <option value="MONTHLY">
                        Mensal
                      </option>

                      <option value="YEARLY" disabled={!hasYearlyPrice(selectedPlan)}>
                        Anual
                      </option>
                    </select>
                  </label>

                  <div className="new-company-start">
                    <span>Como a empresa começará?</span>

                    <button
                      type="button"
                      className={
                        startWithTrial
                          ? "selected"
                          : ""
                      }
                      aria-pressed={startWithTrial}
                      disabled={
                        !hasTrial(selectedPlan)
                      }
                      onClick={() =>
                        setStartWithTrial(true)
                      }
                    >
                      <CalendarDays size={18} />

                      <span>
                        <strong>Teste grátis</strong>

                        <small>
                          {hasTrial(selectedPlan)
                            ? `${selectedPlan?.trialDays} dias`
                            : "Indisponível neste plano"}
                        </small>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={
                        !startWithTrial
                          ? "selected"
                          : ""
                      }
                      aria-pressed={!startWithTrial}
                      onClick={() =>
                        setStartWithTrial(false)
                      }
                    >
                      <CheckCircle2 size={18} />

                      <span>
                        <strong>
                          Ativar imediatamente
                        </strong>

                        <small>
                          Liberar imediatamente
                        </small>
                      </span>
                    </button>
                  </div>
                </div>

                {selectedPlan && (
                  <div className="new-company-summary">
                    <span>Resumo</span>

                    <strong>
                      {selectedPlan.name}
                    </strong>

                    <small>
                      {billingInterval === "MONTHLY"
                        ? `${formatMoney(
                            selectedPlan.monthlyPriceCents,
                          )} / mês`
                        : `${formatMoney(
                            selectedPlan.yearlyPriceCents,
                          )} / ano`}
                    </small>

                    <small>
                      {startWithTrial
                        ? `Começará com ${selectedPlan.trialDays} dias de teste grátis`
                        : "Assinatura será ativada imediatamente pelo fluxo manual"}
                    </small>
                  </div>
                )}
              </>
            )}
          </section>

          {error && (
            <div className="new-company-message error">
              {error}
            </div>
          )}

          {success && (
            <div className="new-company-message success">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <div className="new-company-actions">
            <button
              type="button"
              className="new-company-cancel"
              onClick={() =>
                router.push(
                  "/super-admin/empresas",
                )
              }
              disabled={submitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="new-company-submit"
              disabled={
                submitting ||
                loadingPlans ||
                plans.length === 0
              }
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="plans-spinner"
                  />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Building2 size={18} />
                  Cadastrar empresa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

