import type { AuthMe } from "./contracts";

export const accountSections = ["perfil", "seguranca", "preferencias"] as const;
export type AccountSection = typeof accountSections[number];
export function accountSection(hash: string): AccountSection {
  const value = hash.replace(/^#/, "");
  return accountSections.find(section => section === value) ?? "perfil";
}
export const membershipRoles: Record<AuthMe["memberships"][number]["role"], string> = {
  OWNER: "Proprietário", ADMIN: "Administrador", PROFESSIONAL: "Profissional",
  RECEPTIONIST: "Recepcionista", CLIENT: "Cliente",
};
export function accountMembership(profile: AuthMe) {
  return profile.memberships.find(row => row.company.id === profile.selectedCompanyId);
}
export function accountRole(profile: AuthMe) {
  if (profile.systemRole === "SUPER_ADMIN") return "Super Admin";
  const membership = accountMembership(profile);
  return membership ? membershipRoles[membership.role] : "Sem função selecionada";
}
