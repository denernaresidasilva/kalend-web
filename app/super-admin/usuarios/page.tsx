"use client";

import { apiFetch } from "@/lib/api";

import { Building2, CheckCircle2, Loader2, Search, ShieldCheck, UserCheck, UserRound, Users, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  createdAt: string;
  company: Company;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  memberships: Membership[];
};

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

  useEffect(() => {
    async function loadData() {
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
    }

    loadData();
  }, []);

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
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {
                      const activeMemberships =
                        user.memberships.filter(
                          (membership) =>
                            membership.isActive,
                        );

                      return (
                        <tr key={user.id}>
                          <td>
                            <div>
                              <strong>
                                {user.name}
                              </strong>

                              <span>
                                {user.email}
                              </span>
                            </div>
                          </td>

                          <td>
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

                          <td>
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

                          <td>
                            {user.isActive ? (
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

                          <td>
                            {formatDate(
                              user.createdAt,
                            )}
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
    </main>
  );
}
