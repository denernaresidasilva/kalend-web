"use client";

import { apiFetch } from "@/lib/api";

import { Building2, Check, ChevronRight, CreditCard, Loader2, Pencil, Plus, Search, Trash2, Users, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Company = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
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

type PlanOption = { id: string; name: string; isActive: boolean };
type CompanyStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELED";


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
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", slug: "", timezone: "America/Sao_Paulo", status: "TRIAL" as CompanyStatus, ownerEmail: "", planId: "" });
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const reloadCompanies = useCallback(async () => {
    const response = await apiFetch("/companies", { cache: "no-store" });
    setCompanies(await response.json());
  }, []);

  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoading(true);
        setError("");

        await reloadCompanies();
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
  }, [reloadCompanies]);

  async function openEdit(company: Company) {
    setActionError("");
    setNotice("");
    setEditing(company);
    setEditDraft({
      name: company.name,
      slug: company.slug,
      timezone: company.timezone || "America/Sao_Paulo",
      status: company.status as CompanyStatus,
      ownerEmail: company.owner?.email ?? "",
      planId: company.subscription?.plan?.id ?? "",
    });
    if (!plans.length) {
      try {
        const response = await apiFetch("/plans", { cache: "no-store" });
        setPlans(await response.json());
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Não foi possível carregar os planos.");
      }
    }
  }

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      await apiFetch(`/companies/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editDraft,
          ownerEmail: editDraft.ownerEmail || undefined,
          planId: editing.subscription?.status === "TRIALING" ? editDraft.planId || undefined : undefined,
        }),
      });
      await reloadCompanies();
      setEditing(null);
      setNotice("Empresa atualizada com sucesso.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível atualizar a empresa.");
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteCompany() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      await apiFetch(`/companies/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationName: deleteConfirmation }),
      });
      setCompanies((current) => current.filter((company) => company.id !== deleteTarget.id));
      setNotice("Empresa excluída com sucesso.");
      setDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível excluir a empresa.");
    } finally {
      setActionBusy(false);
    }
  }

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

  const activeSubscriptions = companies.filter(
    (company) =>
      company.subscription?.status === "ACTIVE"
  ).length;

  return (
    <main className="companies-admin-page">
      {notice && <div className="company-action-notice" role="status">{notice}<button type="button" aria-label="Fechar mensagem" onClick={() => setNotice("")}><X size={16} /></button></div>}

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
              className="companies-new-button k-icon-button"
              aria-label="Nova empresa"
              title="Nova empresa"
            >
              <Plus size={18} aria-hidden="true" />
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
                <strong>{activeSubscriptions}</strong>
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
                  aria-label="Buscar empresa" placeholder="Buscar empresa..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            {loading && (
              <div className="companies-state" role="status">
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
              <div className="companies-state error" role="alert">
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
                <div className="companies-state" role="status">
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
                <div className="companies-state" role="status">
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
                <div className="companies-table-wrap" role="region" aria-label="Tabela de empresas" tabIndex={0}>
                  <table className="companies-table">
                    <thead>
                      <tr>
                        <th scope="col">Empresa</th>
                        <th scope="col">Responsável</th>
                        <th scope="col">Plano</th>
                        <th scope="col">Assinatura</th>
                        <th scope="col">Usuários</th>
                        <th scope="col">Cadastro</th>
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
                              <div className="company-row-actions">
                              <button
                                type="button"
                                className="company-edit-button"
                                title="Editar empresa"
                                aria-label={`Editar empresa ${company.name}`}
                                onClick={() => void openEdit(company)}
                              >
                                <Pencil size={15} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                className="company-delete-button"
                                title="Excluir empresa"
                                aria-label={`Excluir empresa ${company.name}`}
                                onClick={() => { setActionError(""); setDeleteConfirmation(""); setDeleteTarget(company); }}
                              >
                                <Trash2 size={15} />
                              </button>
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
                              </div>
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
      {editing && (
        <div className="company-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setEditing(null); }}>
          <section className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-edit-title">
            <header><div><span>ADMINISTRAÇÃO</span><h2 id="company-edit-title">Editar empresa</h2></div><button type="button" aria-label="Fechar" disabled={actionBusy} onClick={() => setEditing(null)}><X size={19} /></button></header>
            <form onSubmit={saveCompany}>
              <label>Nome da empresa<input required maxLength={120} value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} /></label>
              <label>Slug / subdomínio<div className="company-slug-input"><input required maxLength={63} value={editDraft.slug} onChange={(event) => setEditDraft({ ...editDraft, slug: event.target.value })} /><span>.kalend.tech</span></div></label>
              <label>Responsável (e-mail de usuário existente)<input type="email" value={editDraft.ownerEmail} onChange={(event) => setEditDraft({ ...editDraft, ownerEmail: event.target.value })} /><small>Use o e-mail de um usuário ativo existente; deixe vazio para manter a situação atual.</small></label>
              <label>Plano<select disabled={editing.subscription?.status !== "TRIALING"} value={editDraft.planId} onChange={(event) => setEditDraft({ ...editDraft, planId: event.target.value })}><option value="">Manter plano atual</option>{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><small>O plano pode ser ajustado aqui durante o teste grátis. Para assinaturas fora do teste, use a gestão de assinaturas para preservar a cobrança.</small></label>
              <label>Status<select value={editDraft.status} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as CompanyStatus })}><option value="TRIAL">Em teste</option><option value="ACTIVE">Ativa</option><option value="SUSPENDED">Suspensa</option><option value="CANCELED">Cancelada</option></select></label>
              <label>Fuso horário<input required maxLength={80} value={editDraft.timezone} onChange={(event) => setEditDraft({ ...editDraft, timezone: event.target.value })} /></label>
              {actionError && <p className="company-modal-error" role="alert">{actionError}</p>}
              <footer><button type="button" className="company-modal-cancel" disabled={actionBusy} onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="company-modal-save" disabled={actionBusy}>{actionBusy ? <Loader2 size={16} className="plans-spinner" /> : <Check size={16} />}Salvar alterações</button></footer>
            </form>
          </section>
        </div>
      )}
      {deleteTarget && (
        <div className="company-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setDeleteTarget(null); }}>
          <section className="company-modal company-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="company-delete-title" aria-describedby="company-delete-warning">
            <header><div><span>AÇÃO PERMANENTE</span><h2 id="company-delete-title">Excluir empresa</h2></div><button type="button" aria-label="Fechar" disabled={actionBusy} onClick={() => setDeleteTarget(null)}><X size={19} /></button></header>
            <p id="company-delete-warning">Você está prestes a excluir <strong>{deleteTarget.name}</strong>. Esta ação é permanente e remove os dados vinculados à empresa, incluindo vínculos, assinatura, pagamentos, notificações, comunicação e configuração de integração. Usuários compartilhados permanecem na plataforma. A conexão Evolution da empresa é removida; conexões GLOBAL não são afetadas.</p>
            <label>Digite exatamente <strong>{deleteTarget.name}</strong> para confirmar<input autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>
            {actionError && <p className="company-modal-error" role="alert">{actionError}</p>}
            <footer><button type="button" className="company-modal-cancel" disabled={actionBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" className="company-modal-delete" disabled={actionBusy || deleteConfirmation !== deleteTarget.name} onClick={() => void deleteCompany()}>{actionBusy ? <Loader2 size={16} className="plans-spinner" /> : <Trash2 size={16} />}Excluir definitivamente</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
