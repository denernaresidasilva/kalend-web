import type { AuthMe, Regularization } from "./contracts";
import { getCommercialState } from "./commercial-state";
import { accountDestination } from "./company-selection";

export function billingMembership(profile: AuthMe) {
  if (profile.systemRole === "SUPER_ADMIN") return undefined;
  return profile.memberships.find(row => row.company.id === profile.selectedCompanyId && ["OWNER", "ADMIN"].includes(row.role));
}
export function commercialDestination(data: Regularization, normal: string) {
  if (data.financial.requiresAction === true) return "/conta/regularizar";
  if (data.trial.expired === true) return "/planos";
  return normal;
}
export function commercialRedirect(data: Regularization, pathname: string, normal: string) {
  const destination = commercialDestination(data, normal);
  if (destination === pathname) return null;
  if (destination === normal) return pathname === "/conta/regularizar" ? normal : null;
  // Expired users can still choose a plan and use the existing checkout.
  if (destination === "/planos" && pathname === "/conta/planos") return null;
  return destination;
}
export function trialNotice(data: Regularization) {
  if (data.financial.requiresAction || data.trial.expired || !data.trial.active) return null;
  switch (data.trial.remainingDays) {
    case 3: return "Seu período de teste termina em 3 dias.";
    case 2: return "Seu período de teste termina em 2 dias.";
    case 1: return "Seu período de teste termina amanhã.";
    default: return null;
  }
}
export async function loginDestination(profile: AuthMe) {
  const normal = accountDestination(profile);
  if (profile.systemRole === "SUPER_ADMIN" || !profile.selectedCompanyId) return normal;
  try { return commercialDestination(await getCommercialState(profile.selectedCompanyId, profile.user.id), normal); }
  catch { return normal; } // The account guard exposes a technical error and retry, never a financial block.
}
