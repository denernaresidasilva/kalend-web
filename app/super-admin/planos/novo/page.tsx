"use client";

import { apiFetch } from "@/lib/api";

import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Feature = {
  code: string;
  name: string;
  enabled: boolean;
};

const initialFeatures: Feature[] = [
  { code: "agenda", name: "Agenda online", enabled: true },
  { code: "clientes", name: "Gestão de clientes", enabled: true },
  { code: "financeiro", name: "Controle financeiro", enabled: true },
  {
    code: "agendamento_online",
    name: "Agendamento online 24 horas",
    enabled: true,
  },
  { code: "pdv", name: "PDV e comandas", enabled: false },
  {
    code: "lembretes",
    name: "Lembretes automáticos",
    enabled: false,
  },
  {
    code: "campanhas",
    name: "Campanhas para clientes",
    enabled: false,
  },
  {
    code: "fidelidade",
    name: "Programa de fidelidade",
    enabled: false,
  },
  {
    code: "whatsapp",
    name: "Automação por WhatsApp",
    enabled: false,
  },
  {
    code: "multinivel",
    name: "Fidelidade multinível",
    enabled: false,
  },
  {
    code: "relatorios",
    name: "Relatórios avançados",
    enabled: false,
  },
  {
    code: "multiunidade",
    name: "Gestão de múltiplas unidades",
    enabled: false,
  },
];

function moneyToCents(value: string) {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const number = Number(normalized);

  if (Number.isNaN(number)) {
    return 0;
  }

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

export default function NewPlanPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");

  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState("7");

  const [isFeatured, setIsFeatured] = useState(false);
  const [badge, setBadge] = useState("");

  const [maxProfessionals, setMaxProfessionals] = useState("");
  const [maxClients, setMaxClients] = useState("");
  const [maxUnits, setMaxUnits] = useState("1");

  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const [features, setFeatures] =
    useState<Feature[]>(initialFeatures);

  const [newFeatureName, setNewFeatureName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateFeature = (index: number) => {
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
  };

  const removeFeature = (index: number) => {
    setFeatures((current) =>
      current.filter((_, featureIndex) => featureIndex !== index)
    );
  };

  const addFeature = () => {
    const featureName = newFeatureName.trim();

    if (!featureName) {
      return;
    }

    const featureCode = generateCode(featureName);

    if (
      features.some(
        (feature) => feature.code === featureCode
      )
    ) {
      setError("Esse recurso já existe na lista.");
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
  };

  const handleNameChange = (value: string) => {
    setName(value);

    if (!code) {
      setCode(generateCode(value));
    }
  };

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
      setError("Informe o valor mensal do plano.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || undefined,

        monthlyPriceCents: moneyToCents(monthlyPrice),

        yearlyPriceCents: yearlyPrice.trim()
          ? moneyToCents(yearlyPrice)
          : undefined,

        trialEnabled,

        trialDays: trialEnabled ? Number(trialDays) : undefined,

        badge: badge.trim() || undefined,
        isFeatured,

        displayOrder: Number(displayOrder) || 0,

        maxProfessionals: maxProfessionals.trim()
          ? Number(maxProfessionals)
          : undefined,

        maxClients: maxClients.trim()
          ? Number(maxClients)
          : undefined,

        maxUnits: maxUnits.trim()
          ? Number(maxUnits)
          : undefined,

        isActive,

        features: features
          .filter((feature) => feature.enabled)
          .map((feature) => ({
            code: feature.code,
            name: feature.name,
            enabled: true,
          })),
      };

      await apiFetch(
        `/plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      router.push("/super-admin/planos");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o plano."
      );
    } finally {
      setSaving(false);
    }
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

            <h1>Novo plano</h1>

            <p>
              Configure como este plano será vendido e quais
              recursos estarão disponíveis para as empresas.
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

              {saving ? "Criando..." : "Criar plano"}
            </button>
          </div>
        </div>

        {error && (
          <div className="plan-form-error">
            <X size={18} />
            <span>{error}</span>
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
                    Dados principais que identificam o plano.
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
                      handleNameChange(event.target.value)
                    }
                    placeholder="Ex: Profissional"
                  />
                </label>

                <label className="plan-field">
                  <span>Código *</span>

                  <input
                    type="text"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        generateCode(event.target.value)
                      )
                    }
                    placeholder="profissional"
                  />

                  <small>
                    Identificador interno único do plano.
                  </small>
                </label>

                <label className="plan-field plan-field-full">
                  <span>Descrição</span>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Explique para quem este plano é indicado..."
                    rows={4}
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
                    Defina os valores mensal e anual.
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
                      placeholder="89,90"
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
                      placeholder="862,80"
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
                    Configure o período de avaliação para
                    novas empresas.
                  </p>
                </div>
              </div>

              <div className="plan-setting-row">
                <div>
                  <strong>Permitir teste grátis</strong>
                  <span>
                    Empresas poderão experimentar este plano
                    antes de pagar.
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
                  aria-label="Ativar teste grátis"
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
                      min="1"
                      max="365"
                      value={trialDays}
                      onChange={(event) =>
                        setTrialDays(event.target.value)
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
                    Deixe vazio quando quiser oferecer
                    quantidade ilimitada.
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
                    onChange={(event) =>
                      setMaxProfessionals(
                        event.target.value
                      )
                    }
                    placeholder="Ilimitado"
                  />
                </label>

                <label className="plan-field">
                  <span>Clientes</span>

                  <input
                    type="number"
                    min="1"
                    value={maxClients}
                    onChange={(event) =>
                      setMaxClients(event.target.value)
                    }
                    placeholder="Ilimitado"
                  />
                </label>

                <label className="plan-field">
                  <span>Unidades</span>

                  <input
                    type="number"
                    min="1"
                    value={maxUnits}
                    onChange={(event) =>
                      setMaxUnits(event.target.value)
                    }
                    placeholder="Ilimitado"
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
                    Selecione o que as empresas deste plano
                    poderão utilizar.
                  </p>
                </div>
              </div>

              <div className="plan-features-editor">
                {features.map((feature, index) => (
                  <div
                    className="plan-feature-editor-row"
                    key={feature.code}
                  >
                    <button
                      type="button"
                      className={`feature-checkbox ${
                        feature.enabled ? "checked" : ""
                      }`}
                      onClick={() =>
                        updateFeature(index)
                      }
                    >
                      {feature.enabled && (
                        <Check size={14} />
                      )}
                    </button>

                    <div>
                      <strong>{feature.name}</strong>
                      <span>{feature.code}</span>
                    </div>

                    <button
                      type="button"
                      className="feature-delete-button"
                      onClick={() =>
                        removeFeature(index)
                      }
                      aria-label="Remover recurso"
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
                  onChange={(event) =>
                    setNewFeatureName(event.target.value)
                  }
                  placeholder="Nome do novo recurso"
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
                    Controle a disponibilidade do plano.
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
                  <strong>Plano em destaque</strong>
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

              <label className="plan-field">
                <span>Selo do plano</span>

                <input
                  type="text"
                  value={badge}
                  onChange={(event) =>
                    setBadge(event.target.value)
                  }
                  placeholder="Ex: Mais escolhido"
                />
              </label>

              <label className="plan-field">
                <span>Ordem de exibição</span>

                <div className="select-like-input">
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

                  <ChevronDown size={16} />
                </div>
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

              <h3>{name || "Nome do plano"}</h3>

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
                  {trialDays || "0"} dias de teste grátis
                </div>
              )}

              <div className="plan-preview-features">
                {features
                  .filter((feature) => feature.enabled)
                  .slice(0, 6)
                  .map((feature) => (
                    <div key={feature.code}>
                      <Check size={14} />
                      <span>{feature.name}</span>
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

            {saving ? "Criando..." : "Criar plano"}
          </button>
        </div>
      </form>
    </main>
  );
}
