import type { PublicPlan } from "./contracts";
export type BillingInterval = "MONTHLY" | "YEARLY";
export function annualAvailable(plan: PublicPlan) {
  return typeof plan.yearlyPriceCents === "number" && Number.isSafeInteger(plan.yearlyPriceCents) && plan.yearlyPriceCents > 0;
}
export function annualSaving(plan: PublicPlan) {
  if (!annualAvailable(plan) || !Number.isSafeInteger(plan.monthlyPriceCents) || plan.monthlyPriceCents <= 0) return null;
  const reference = plan.monthlyPriceCents * 12;
  const cents = reference - plan.yearlyPriceCents!;
  return cents > 0 ? { cents, percent: Math.floor(cents / reference * 100) } : null;
}
export function selectPlanInterval(plan: PublicPlan, interval: BillingInterval): BillingInterval {
  return interval === "YEARLY" && annualAvailable(plan) ? "YEARLY" : "MONTHLY";
}
export function planLimit(value: number | null | undefined) {
  return value === null ? "Sem limite definido" : typeof value === "number" && Number.isInteger(value) && value >= 0 ? value.toLocaleString("pt-BR") : "Não informado";
}
export const planLimits = [
  ["Profissionais", "maxProfessionals"], ["Clientes", "maxClients"], ["Unidades", "maxUnits"], ["Mensagens", "maxMessages"],
] as const;
