import { api, jsonBody, tenantChanged, withTenantLock } from "./api";
import type { AuthMe } from "./contracts";

// /auth/me already filters inactive memberships, retaining billing-recovery access.
// Count distinct companies; never invent a membership or derive access from a URL.
export function linkedCompanies(profile: AuthMe) {
  return profile.memberships.filter((membership, index, memberships) =>
    !!membership.company.id && memberships.findIndex(row => row.company.id === membership.company.id) === index);
}
export function accountDestination(profile: AuthMe) {
  return profile.systemRole === "SUPER_ADMIN" ? "/super-admin" : "/conta";
}
export async function selectCompany(profile: AuthMe, companyId: string): Promise<AuthMe> {
  if (!companyId || !linkedCompanies(profile).some(row => row.company.id === companyId)) {
    throw new Error("Escolha uma empresa vinculada à sua conta.");
  }
  const selected = await withTenantLock(async () => {
    const current = await api<AuthMe>("/auth/me");
    if (current.user.id !== profile.user.id || !linkedCompanies(current).some(row => row.company.id === companyId)) {
      throw new Error("A sessão ou o vínculo com a empresa mudou. Atualize a página.");
    }
    if (current.selectedCompanyId === companyId) return current;
    const result = await api<AuthMe>("/auth/tenant", { method: "POST", ...jsonBody({ companyId }) });
    if (result.user.id !== profile.user.id || result.selectedCompanyId !== companyId ||
        !linkedCompanies(result).some(row => row.company.id === companyId)) {
      throw new Error("Não foi possível confirmar a empresa na sessão.");
    }
    return result;
  });
  tenantChanged();
  return selected;
}
export async function prepareLogin(profile: AuthMe) {
  const companies = linkedCompanies(profile);
  if (companies.length === 1) return selectCompany(profile, companies[0].company.id);
  return profile;
}
