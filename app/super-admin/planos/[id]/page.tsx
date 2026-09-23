"use client";

import {
  ArrowLeft,
  Building2,
  Check,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Feature = {
  id?: string;
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

function centsToMoney(value: number | null) {
  if (value === null || value === undefined) return "";

  return (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyToCents(value: string) {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const number = Number(normalized);

  if (Number.isNaN(number)) return 0;

  return Math.round(number * 100);
}

function generateCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");

  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState("7");

  const [isFeatured, setIsFeatured] = useState(false);
  const [badge, setBadge] = useState("");

  const [maxProfessionals, setMaxProfessionals] =
    useState("");

  const [maxClients, setMaxClients] = useState("");

  const [maxUnits, setMaxUnits] = useState("");

  const [displayOrder, setDisplayOrder] = useState("0");

  const [isActive, setIsActive] = useState(true);

  const [features, setFeatures] = useState<Feature[]>([]);

  const [newFeatureName, setNewFeatureName] =
    useState("");

  useEffect(() => {
    async function loadPlan() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `https://api.kalend.tech/plans/${id}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Plano não encontrado."
              : "Não foi possível carregar o plano."
          );
        }

        const plan: Plan = await response.json();

        setName(plan.name);
        setCode(plan.code);
        setDescription(plan.description ?? "");

        setMonthlyPrice(
          centsToMoney(plan.monthlyPriceCents)
        );

        setYearlyPrice(
          centsToMoney(plan.yearlyPriceCents)
        );

        setTrialEnabled(plan.trialEnabled);
        setTrialDays(String(plan.trialDays ?? 0));

        setIsFeatured(plan.isFeatured);
        setBadge(plan.badge ?? "");

        setMaxProfessionals(
          plan.maxProfessionals === null
            ? ""
            : String(plan.maxProfessionals)
        );

        setMaxClients(
          plan.maxClients === null
            ? ""
            : String(plan.maxClients)
        );

        setMaxUnits(
          plan.maxUnits === null
            ? ""
            : String(plan.maxUnits)
        );

        setDisplayOrder(
          String(plan.displayOrder ?? 0)
        );

        setIsActive(plan.isActive);

        setFeatures(
          (plan.features ?? []).map((feature) => ({
            id: feature.id,
            code: feature.code,
            name: feature.name,
            enabled: feature.enabled,
          }))
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o plano."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadPlan();
    }
  }, [id]);

  function toggleFeature(index: number) {
    setFeatures((current) =>
      current.map((feature, featureIndex) =>
        featureIndex === index
          ? {
              ...feature,
              enabled: !feature.enabled,
            }
          : feature
      )
    );
  }

  function removeFeature(index: number) {
    setFeatures((current) =>
      current.filter(
        (_, featureIndex) => featureIndex !== index
      )
    );
  }

  function addFeature() {
    const featureName = newFeatureName.trim();

    if (!featureName) return;

    const featureCode = generateCode(featureName);

    if (
      features.some(
        (feature) => feature.code === featureCode
      )
    ) {
      setError("Esse recurso já existe no plano.");
      return;
    }

    setFeatures((current) => [
      ...current,
      {
        code: featureCode,
        name: featureName,
        enabled: true,
      },
    ]);

    setNewFeatureName("");
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do plano.");
      return;
    }

    if (!code.trim()) {
      setError("Informe o código do plano.");
      return;
    }

    if (!monthlyPrice.trim()) {
      setError("Informe o valor mensal.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,

        monthlyPriceCents:
          moneyToCents(monthlyPrice),

        yearlyPriceCents: yearlyPrice.trim()
          ? moneyToCents(yearlyPrice)
          : null,

        trialEnabled,

        trialDays: trialEnabled
          ? Number(trialDays) || 0
          : 0,

        badge: badge.trim() || null,

        isFeatured,

        displayOrder:
          Number(displayOrder) || 0,

        maxProfessionals:
          maxProfessionals.trim()
            ? Number(maxProfessionals)
            : null,

        maxClients: maxClients.trim()
          ? Number(maxClients)
          : null,

        maxUnits: maxUnits.trim()
          ? Number(maxUnits)
          : null,

        isActive,

        features: features.map((feature) => ({
          code: feature.code,
          name: feature.name,
          enabled: feature.enabled,
        })),
      };

      const response = await fetch(
        `https://api.kalend.tech/plans/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const responseData = await response
          .json()
          .catch(() => null);

        throw new Error(
          Array.isArray(responseData?.message)
            ? responseData.message.join(", ")
            : responseData?.message ||
                "Não foi possível salvar o plano."
        );
      }

      setSuccess("Plano atualizado com sucesso.");

      window.setTimeout(() => {
        router.push("/super-admin/planos");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o plano."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="plan-form-page">
        <div
          className="plan-form-container"
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="plans-loading">
            <Loader2
              size={25}
              className="plans-spinner"
            />
            <span>Carregando plano...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="plan-form-page">
      <header className="plan-form-topbar">
        <div className="plan-form-topbar-inner">
          <button
            type="button"
            className="plan-back-button"
            onClick={() =>
              router.push("/super-admin/planos")
            }
          >
            <ArrowLeft size={19} />
            <span>Voltar</span>
          </button>

          <div className="plan-form-brand">
            <div>K</div>
            <strong>Kalend</strong>
            <span>Super Admin</span>
          </div>
        </div>
      </header>

      <form
        className="plan-form-container"
        onSubmit={handleSubmit}
      >
        <div className="plan-form-heading">
          <div>
            <span className="dashboard-eyebrow">
              PLANOS E ASSINATURAS
            </span>

            <h1>Editar plano</h1>

            <p>
              Altere preços, limites, recursos e
              disponibilidade deste plano.
            </p>
          </div>

          <div className="plan-form-heading-actions">
            <button
              type="button"
              className="plan-cancel-button"
              onClick={() =>
                router.push("/super-admin/planos")
              }
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="plan-save-button"
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={18}
                  className="plans-spinner"
                />
              ) : (
                <Save size={18} />
              )}

              {saving
                ? "Salvando..."
                : "Salvar alterações"}
            </button>
          </div>
        </div>

        {error && (
          <div className="plan-form-error">
            <X size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            className="plan-form-error"
            style={{
              background: "#effbf5",
              borderColor: "#cdeedd",
              color: "#19734d",
            }}
          >
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}

        <div className="plan-form-layout">
          <div className="plan-form-content">
            <section className="plan-form-card">
              <div className="plan-section-heading">
                <div className="plan-section-icon">
                  <CreditCard size={20} />
                </div>

                <div>
                  <h2>Informações do plano</h2>
                  <p>
                    Dados principais que identificam o
                    plano.
                  </p>
                </div>
              </div>

              <div className="plan-fields-grid">
                <label className="plan-field">
                  <span>Nome do plano *</span>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                  />
                </label>

                <label className="plan-field">
                  <span>Código *</span>

                  <input
                    type="text"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        generateCode(
                          event.target.value
                        )
                      )
                    }
                  />

                  <small>
                    Identificador interno único.
                  </small>
                </label>

                <label className="plan-field plan-field-full">
                  <span>Descrição</span>

                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="plan-form-card">
              <div className="plan-section-heading">
                <div className="plan-section-icon green">
                  <CircleDollarSign size={20} />
                </div>

                <div>
                  <h2>Preço e cobrança</h2>
                  <p>
                    Valores mensal e anual deste plano.
                  </p>
                </div>
              </div>

              <div className="plan-fields-grid">
                <label className="plan-field">
                  <span>Valor mensal *</span>

                  <div className="money-input">
                    <span>R$</span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={monthlyPrice}
                      onChange={(event) =>
                        setMonthlyPrice(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </label>

                <label className="plan-field">
                  <span>Valor anual</span>

                  <div className="money-input">
                    <span>R$</span>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={yearlyPrice}
                      onChange={(event) =>
                        setYearlyPrice(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="plan-form-card">
              <div className="plan-section-heading">
                <div className="plan-section-icon purple">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h2>Teste grátis</h2>
                  <p>
                    Período de avaliação deste plano.
                  </p>
                </div>
              </div>

              <div className="plan-setting-row">
                <div>
                  <strong>
                    Permitir teste grátis
                  </strong>
                  <span>
                    Novas empresas poderão experimentar
                    antes do pagamento.
                  </span>
                </div>

                <button
                  type="button"
                  className={`plan-switch ${
                    trialEnabled ? "on" : ""
                  }`}
                  onClick={() =>
                    setTrialEnabled(!trialEnabled)
                  }
                >
                  <span />
                </button>
              </div>

              {trialEnabled && (
                <label className="plan-field trial-days-field">
                  <span>Duração do teste</span>

                  <div className="number-suffix-input">
                    <input
                      type="number"
                      min="0"
                      value={trialDays}
                      onChange={(event) =>
                        setTrialDays(
                          event.target.value
                        )
                      }
                    />

                    <span>dias</span>
                  </div>
                </label>
              )}
            </section>

            <section className="plan-form-card">
              <div className="plan-section-heading">
                <div className="plan-section-icon blue">
                  <Building2 size={20} />
                </div>

                <div>
                  <h2>Limites do plano</h2>
                  <p>
                    Campo vazio significa ilimitado.
                  </p>
                </div>
              </div>

              <div className="plan-fields-grid three">
                <label className="plan-field">
                  <span>Profissionais</span>
                  <input
                    type="number"
                    min="1"
                    value={maxProfessionals}
                    placeholder="Ilimitado"
                    onChange={(event) =>
                      setMaxProfessionals(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="plan-field">
                  <span>Clientes</span>
                  <input
                    type="number"
                    min="1"
                    value={maxClients}
                    placeholder="Ilimitado"
                    onChange={(event) =>
                      setMaxClients(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="plan-field">
                  <span>Unidades</span>
                  <input
                    type="number"
                    min="1"
                    value={maxUnits}
                    placeholder="Ilimitado"
                    onChange={(event) =>
                      setMaxUnits(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="plan-form-card">
              <div className="plan-section-heading">
                <div className="plan-section-icon purple">
                  <Check size={20} />
                </div>

                <div>
                  <h2>Recursos incluídos</h2>
                  <p>
                    Ative, desative, adicione ou remova
                    recursos.
                  </p>
                </div>
              </div>

              <div className="plan-features-editor">
                {features.map((feature, index) => (
                  <div
                    className="plan-feature-editor-row"
                    key={`${feature.code}-${index}`}
                  >
                    <button
                      type="button"
                      className={`feature-checkbox ${
                        feature.enabled
                          ? "checked"
                          : ""
                      }`}
                      onClick={() =>
                        toggleFeature(index)
                      }
                    >
                      {feature.enabled && (
                        <Check size={14} />
                      )}
                    </button>

                    <div>
                      <strong>
                        {feature.name}
                      </strong>
                      <span>{feature.code}</span>
                    </div>

                    <button
                      type="button"
                      className="feature-delete-button"
                      onClick={() =>
                        removeFeature(index)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-feature-row">
                <input
                  type="text"
                  value={newFeatureName}
                  placeholder="Nome do novo recurso"
                  onChange={(event) =>
                    setNewFeatureName(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addFeature();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={addFeature}
                >
                  <Plus size={17} />
                  Adicionar
                </button>
              </div>
            </section>
          </div>

          <aside className="plan-form-sidebar">
            <section className="plan-form-card">
              <div className="plan-section-heading compact">
                <div>
                  <h2>Publicação</h2>
                  <p>
                    Disponibilidade deste plano.
                  </p>
                </div>
              </div>

              <div className="plan-setting-row">
                <div>
                  <strong>Plano ativo</strong>
                  <span>
                    Disponível para contratação.
                  </span>
                </div>

                <button
                  type="button"
                  className={`plan-switch ${
                    isActive ? "on" : ""
                  }`}
                  onClick={() =>
                    setIsActive(!isActive)
                  }
                >
                  <span />
                </button>
              </div>

              <div className="plan-setting-row">
                <div>
                  <strong>
                    Plano em destaque
                  </strong>
                  <span>
                    Destacar na página de vendas.
                  </span>
                </div>

                <button
                  type="button"
                  className={`plan-switch ${
                    isFeatured ? "on" : ""
                  }`}
                  onClick={() =>
                    setIsFeatured(!isFeatured)
                  }
                >
                  <span />
                </button>
              </div>

              <label
                className="plan-field"
                style={{ marginTop: 18 }}
              >
                <span>Selo do plano</span>

                <input
                  type="text"
                  value={badge}
                  placeholder="Ex: Mais escolhido"
                  onChange={(event) =>
                    setBadge(event.target.value)
                  }
                />
              </label>

              <label
                className="plan-field"
                style={{ marginTop: 15 }}
              >
                <span>Ordem de exibição</span>

                <input
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(event) =>
                    setDisplayOrder(
                      event.target.value
                    )
                  }
                />
              </label>
            </section>

            <section className="plan-preview-card">
              <span className="plan-preview-label">
                PRÉVIA
              </span>

              {badge && (
                <div className="plan-preview-badge">
                  <Sparkles size={13} />
                  {badge}
                </div>
              )}

              <h3>
                {name || "Nome do plano"}
              </h3>

              <p>
                {description ||
                  "A descrição do plano aparecerá aqui."}
              </p>

              <div className="plan-preview-price">
                <strong>
                  R$ {monthlyPrice || "0,00"}
                </strong>
                <span>/mês</span>
              </div>

              {trialEnabled && (
                <div className="plan-preview-trial">
                  <Sparkles size={15} />
                  {trialDays || "0"} dias de teste
                  grátis
                </div>
              )}

              <div className="plan-preview-features">
                {features
                  .filter(
                    (feature) => feature.enabled
                  )
                  .slice(0, 6)
                  .map((feature) => (
                    <div key={feature.code}>
                      <Check size={14} />
                      <span>
                        {feature.name}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="plan-mobile-actions">
          <button
            type="button"
            onClick={() =>
              router.push("/super-admin/planos")
            }
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <Loader2
                size={17}
                className="plans-spinner"
              />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </main>
  );
}
