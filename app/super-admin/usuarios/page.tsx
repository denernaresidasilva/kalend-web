"use client";

import { apiFetch } from "@/lib/api";

import { Building2, CheckCircle2, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, UserCheck, UserRound, Users, UserX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Company = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isActive: boolean;
};

type Membership = {
  id: string;
  role: string;
  isActive: boolean;
  hasAccess: boolean;
  isLinked: boolean;
  createdAt: string;
  company: Company;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  accountActive: boolean;
  canAuthenticate: boolean;
  canAccessTenant: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  memberships: Membership[];
};

type CompanyOption = { id: string; name: string; status: string; isActive?: boolean };
type MembershipDraft = { companyId: string; role: string; isActive: boolean };
const membershipRoles = ["OWNER", "ADMIN", "RECEPTIONIST", "PROFESSIONAL", "CLIENT"];

type UsersSummary = {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  owners: number;
  professionals: number;
  clients: number;
};


function roleLabel(role: string) {
  const labels: Record<string, string> = {
    OWNER: "Proprietário",
    ADMIN: "Administrador",
    RECEPTIONIST: "Recepcionista",
    PROFESSIONAL: "Profissional",
    CLIENT: "Cliente",
  };

  return labels[role] ?? role;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function UsuariosPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UsersSummary>({
    total: 0,
    active: 0,
    inactive: 0,
    superAdmins: 0,
    owners: 0,
    professionals: 0,
    clients: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", phone: "", isActive: false, memberships: [] as MembershipDraft[] });
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [usersResponse, summaryResponse] =
          await Promise.all([
            apiFetch(`/users`, {
              cache: "no-store",
            }),
            apiFetch(
              `/users/summary`,
              {
                cache: "no-store",
              },
            ),
          ]);

        if (
          !usersResponse.ok ||
          !summaryResponse.ok
        ) {
          throw new Error(
            "Não foi possível carregar os usuários.",
          );
        }

        const usersData = await usersResponse.json();
        const summaryData =
          await summaryResponse.json();

        setUsers(usersData);
        setSummary(summaryData);
      } catch (err) {
        console.error(err);

        setError(
          "Não foi possível carregar os usuários.",
        );
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadData(); }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function openEdit(user: User) {
    setActionError("");
    setCompaniesLoaded(false);
    setEditing(user);
    setEditDraft({
      name: user.name,
      phone: user.phone ?? "",
      isActive: user.accountActive,
      memberships: user.memberships.map(({ company, role, isActive }) => ({ companyId: company.id, role, isActive })),
    });
    try {
      const response = await apiFetch("/companies?limit=100", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar as empresas.");
      const available: CompanyOption[] = await response.json();
      const all = [...user.memberships.map(({ company }) => company), ...available];
      setCompanies([...new Map(all.map((company) => [company.id, company])).values()]);
      setCompaniesLoaded(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível carregar as empresas.");
    }
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || actionBusy) return;
    setActionBusy(true); setActionError("");
    try {
      const response = await apiFetch(`/users/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          phone: editDraft.phone || null,
          isActive: editDraft.isActive,
          ...(!editing.isSuperAdmin ? { memberships: editDraft.memberships } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Não foi possível atualizar o usuário.");
      }
      setEditing(null);
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível atualizar o usuário.");
    } finally { setActionBusy(false); }
  }

  async function deleteUser() {
    if (!deleteTarget || actionBusy || deleteConfirmation.trim().toLowerCase() !== deleteTarget.email.trim().toLowerCase()) return;
    setActionBusy(true); setActionError("");
    try {
      const response = await apiFetch(`/users/${deleteTarget.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationEmail: deleteConfirmation }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Não foi possível excluir o usuário.");
      }
      const wasOperationallyActive = deleteTarget.canAuthenticate;
      const removedRoles = deleteTarget.memberships.filter((membership) => membership.isActive);
      const removedAccessibleRoles = removedRoles.filter((membership) => membership.hasAccess);
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setSummary((current) => ({
        ...current,
        active: Math.max(0, current.active - (wasOperationallyActive ? 1 : 0)),
        inactive: current.inactive + (wasOperationallyActive ? 1 : 0),
        owners: Math.max(0, current.owners - removedRoles.filter((membership) => membership.role === "OWNER").length),
        professionals: Math.max(0, current.professionals - removedAccessibleRoles.filter((membership) => membership.role === "PROFESSIONAL").length),
        clients: Math.max(0, current.clients - removedAccessibleRoles.filter((membership) => membership.role === "CLIENT").length),
      }));
      setDeleteTarget(null); setDeleteConfirmation("");
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível excluir o usuário.");
    } finally { setActionBusy(false); }
  }

  const filteredUsers = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => {
      const companies = user.memberships
        .map((membership) => membership.company.name)
        .join(" ")
        .toLowerCase();

      const roles = user.memberships
        .map((membership) =>
          roleLabel(membership.role),
        )
        .join(" ")
        .toLowerCase();

      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone ?? "")
          .toLowerCase()
          .includes(term) ||
        companies.includes(term) ||
        roles.includes(term)
      );
    });
  }, [users, search]);

  return (
    <main className="companies-admin-page">

      <section className="companies-main">
        <header className="companies-topbar">
          <div>
            <h1>Usuários</h1>
            <p>
              Gerencie os usuários cadastrados
              na plataforma.
            </p>
          </div>


        </header>

        <div className="companies-content">
          <section className="companies-summary">
            <div className="companies-summary-card">
              <div>
                <span>Total de usuários</span>
                <strong>{summary.total}</strong>
              </div>

              <Users size={23} />
            </div>

            <div className="companies-summary-card">
              <div>
                <span>Usuários ativos</span>
                <strong>{summary.active}</strong>
              </div>

              <UserCheck size={23} />
            </div>

            <div className="companies-summary-card">
              <div>
                <span>Inativos</span>
                <strong>{summary.inactive}</strong>
              </div>

              <UserX size={23} />
            </div>

            <div className="companies-summary-card">
              <div>
                <span>Super Admins</span>
                <strong>
                  {summary.superAdmins}
                </strong>
              </div>

              <ShieldCheck size={23} />
            </div>
          </section>

          <section className="finance-secondary-stats">
            <div>
              <Building2 size={20} />

              <span>Proprietários</span>

              <strong>{summary.owners}</strong>
            </div>

            <div>
              <UserRound size={20} />

              <span>Profissionais</span>

              <strong>
                {summary.professionals}
              </strong>
            </div>

            <div>
              <Users size={20} />

              <span>Clientes</span>

              <strong>{summary.clients}</strong>
            </div>
          </section>

          <section className="companies-panel">
            <div className="companies-panel-header">
              <div>
                <h2>Todos os usuários</h2>

                <p>
                  Usuários cadastrados em todas
                  as empresas do Kalend.
                </p>
              </div>

              <div className="companies-search">
                <Search size={18} />

                <input
                  type="text"
                  aria-label="Buscar usuário" placeholder="Buscar usuário..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            {loading ? (
              <div className="companies-empty" role={error ? "alert" : "status"}>
                <Loader2
                  size={30}
                  className="animate-spin"
                />

                <strong>
                  Carregando usuários...
                </strong>
              </div>
            ) : error ? (
              <div className="companies-empty" role={error ? "alert" : "status"}>
                <UserX size={34} />

                <strong>{error}</strong>

                <span>
                  Atualize a página para tentar
                  novamente.
                </span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="companies-empty" role={error ? "alert" : "status"}>
                <Users size={38} />

                <strong>
                  {search
                    ? "Nenhum usuário encontrado"
                    : "Nenhum usuário cadastrado"}
                </strong>

                <span>
                  {search
                    ? "Tente pesquisar por outro nome, e-mail ou empresa."
                    : "Os usuários aparecerão aqui quando forem cadastrados."}
                </span>
              </div>
            ) : (
              <div className="companies-table-wrapper" role="region" aria-label="Tabela de usuarios" tabIndex={0}>
                <table className="companies-table">
                  <thead>
                    <tr>
                      <th scope="col">Usuário</th>
                      <th scope="col">Empresa</th>
                      <th scope="col">Função</th>
                      <th scope="col">Status</th>
                      <th scope="col">Cadastro</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {
                      const activeMemberships =
                        user.memberships.filter(
                          (membership) =>
                            membership.isLinked,
                        );

                      return (
                        <tr key={user.id}>
                          <td data-label="Usuário">
                            <div>
                              <strong>
                                {user.name}
                              </strong>

                              <span>
                                {user.email}
                              </span>
                            </div>
                          </td>

                          <td data-label="Empresa">
                            {activeMemberships.length >
                            0 ? (
                              <div>
                                {activeMemberships.map(
                                  (membership) => (
                                    <div
                                      key={
                                        membership.id
                                      }
                                    >
                                      {
                                        membership
                                          .company
                                          .name
                                      }
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : user.isSuperAdmin ? (
                              <span>
                                Plataforma Kalend
                              </span>
                            ) : (
                              <span>
                                Sem empresa
                              </span>
                            )}
                          </td>

                          <td data-label="Função">
                            {user.isSuperAdmin ? (
                              <span className="finance-status finance-status-success">
                                Super Admin
                              </span>
                            ) : activeMemberships.length >
                              0 ? (
                              <div>
                                {activeMemberships.map(
                                  (membership) => (
                                    <div
                                      key={
                                        membership.id
                                      }
                                    >
                                      {roleLabel(
                                        membership.role,
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td data-label="Status">
                            {user.canAuthenticate ? (
                              <span className="finance-status finance-status-success">
                                <CheckCircle2
                                  size={13}
                                />
                                Ativo
                              </span>
                            ) : (
                              <span className="finance-status finance-status-danger">
                                Inativo
                              </span>
                            )}
                          </td>

                          <td data-label="Cadastro">
                            {formatDate(
                              user.createdAt,
                            )}
                          </td>
                          <td data-label="Ações">
                            <div className="company-row-actions">
                              <button type="button" className="company-edit-button" onClick={() => void openEdit(user)} aria-label={`Editar usuário ${user.name}`}>
                                <Pencil size={15} /><span>Editar</span>
                              </button>
                              {!user.isSuperAdmin && <button type="button" className="company-delete-button" onClick={() => { setActionError(""); setDeleteConfirmation(""); setDeleteTarget(user); }} aria-label={`Excluir usuário ${user.name}`} title="Excluir usuário">
                                <Trash2 size={15} />
                              </button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
      {editing && (
        <div className="company-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setEditing(null); }}>
          <section className="company-modal user-admin-modal" role="dialog" aria-modal="true" aria-labelledby="user-edit-title">
            <header><div><span>ADMINISTRAÇÃO</span><h2 id="user-edit-title">Editar usuário</h2></div><button type="button" aria-label="Fechar" disabled={actionBusy} onClick={() => setEditing(null)}><X size={19} /></button></header>
            <form onSubmit={saveUser}>
              <label>Nome<input required maxLength={120} value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} /></label>
              <label>E-mail<input readOnly value={editing.email} /><small>O e-mail é o identificador de login e não pode ser alterado por este fluxo.</small></label>
              <label>Telefone<input maxLength={32} value={editDraft.phone} onChange={(event) => setEditDraft({ ...editDraft, phone: event.target.value })} /></label>
              <label>Status de acesso<select disabled={editing.isSuperAdmin} value={editDraft.isActive ? "active" : "inactive"} onChange={(event) => setEditDraft({ ...editDraft, isActive: event.target.value === "active" })}><option value="active">Ativo</option><option value="inactive">Inativo</option></select><small>Usuário comum sem empresa ativa não consegue acessar, mesmo que a conta esteja ativada.</small></label>
              {editing.isSuperAdmin ? <p className="user-admin-note">Super Admin não pode ser desativado nem ter vínculos de tenant alterados nesta tela.</p> : <section className="user-membership-editor" aria-label="Empresas e funções">
                <div className="user-membership-heading"><strong>Empresas e funções</strong><button type="button" className="company-edit-button" onClick={() => setEditDraft({ ...editDraft, memberships: [...editDraft.memberships, { companyId: "", role: "PROFESSIONAL", isActive: true }] })}><Plus size={15} />Adicionar empresa</button></div>
                {editDraft.memberships.length === 0 && <p>Este usuário não possui empresas vinculadas.</p>}
                {editDraft.memberships.map((membership, index) => <div className="user-membership-row" key={`${membership.companyId}:${index}`}>
                  <label>Empresa<select required value={membership.companyId} onChange={(event) => setEditDraft({ ...editDraft, memberships: editDraft.memberships.map((item, row) => row === index ? { ...item, companyId: event.target.value } : item) })}><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.isActive === false || ["SUSPENDED", "CANCELED"].includes(company.status) ? " (inativa)" : ""}</option>)}</select></label>
                  <label>Função<select value={membership.role} onChange={(event) => setEditDraft({ ...editDraft, memberships: editDraft.memberships.map((item, row) => row === index ? { ...item, role: event.target.value } : item) })}>{membershipRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
                  <label className="user-membership-active"><input type="checkbox" checked={membership.isActive} onChange={(event) => setEditDraft({ ...editDraft, memberships: editDraft.memberships.map((item, row) => row === index ? { ...item, isActive: event.target.checked } : item) })} /> Vínculo ativo</label>
                  <button type="button" className="company-delete-button" aria-label="Remover vínculo" onClick={() => setEditDraft({ ...editDraft, memberships: editDraft.memberships.filter((_, row) => row !== index) })}><Trash2 size={15} /></button>
                </div>)}
              </section>}
              {actionError && <p className="company-modal-error" role="alert">{actionError}</p>}
              <footer><button type="button" className="company-modal-cancel" disabled={actionBusy} onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="company-modal-save" disabled={actionBusy || (!editing.isSuperAdmin && !companiesLoaded)}>{actionBusy ? <Loader2 size={16} className="plans-spinner" /> : <CheckCircle2 size={16} />}Salvar alterações</button></footer>
            </form>
          </section>
        </div>
      )}
      {deleteTarget && (
        <div className="company-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionBusy) setDeleteTarget(null); }}>
          <section className="company-modal company-delete-modal user-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="user-delete-title" aria-describedby="user-delete-warning">
            <header><div><span>AÇÃO DE DESATIVAÇÃO</span><h2 id="user-delete-title">Excluir usuário</h2></div><button type="button" aria-label="Fechar" disabled={actionBusy} onClick={() => setDeleteTarget(null)}><X size={19} /></button></header>
            <p id="user-delete-warning">A conta de <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) será desativada. Todas as memberships serão desativadas e as sessões revogadas. O histórico será preservado; esta operação não apaga registros históricos.</p>
            <label>Digite exatamente o e-mail <strong>{deleteTarget.email}</strong> para confirmar<input autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>
            {actionError && <p className="company-modal-error" role="alert">{actionError}</p>}
            <footer><button type="button" className="company-modal-cancel" disabled={actionBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" className="company-modal-delete" disabled={actionBusy || deleteConfirmation.trim().toLowerCase() !== deleteTarget.email.trim().toLowerCase()} onClick={() => void deleteUser()}>{actionBusy ? <Loader2 size={16} className="plans-spinner" /> : <Trash2 size={16} />}Excluir definitivamente</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
