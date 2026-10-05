import type { AuthMe } from "../contracts";
import { accountDestination } from "../company-selection";

// Allow only existing authenticated areas. New public routes stay excluded by default.
export function pushPromptAllowed(profile: AuthMe | null, pathname: string) {
  if (!profile) return false;
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) return profile.systemRole === "SUPER_ADMIN";
  if (profile.systemRole !== "SUPER_ADMIN" && !profile.memberships.some(row => row.company.id === profile.selectedCompanyId)) return false;
  return pathname === "/conta" || pathname.startsWith("/conta/") || pathname === accountDestination(profile);
}
