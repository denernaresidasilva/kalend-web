import { tenantApi } from "./api";
import type { Regularization } from "./contracts";

let epoch = 0;
let cached: { key: string; data: Regularization; validUntil: number } | null = null;
const elapsed = () => typeof performance === "undefined" ? Date.now() : performance.now();
export function commercialRevalidationDelay(data: Regularization) {
  if (typeof data.revalidateAfterMs === "number" && Number.isFinite(data.revalidateAfterMs))
    return Math.max(1, Math.min(15000, data.revalidateAfterMs));
  // Compatibility with servers predating the explicit refresh interval.
  const end = data.trial.active && data.trial.endsAt ? Date.parse(data.trial.endsAt) - Date.parse(data.serverNow) : 15000;
  return Math.max(1, Math.min(15000, Number.isFinite(end) ? end : 15000));
}
export function cachedCommercialState(companyId: string, userId: string) {
  return cached?.key === `${userId}:${companyId}` ? cached.data : null;
}
let flight: { key: string; promise: Promise<Regularization> } | null = null;
export function clearCommercialState() { epoch++; cached = null; flight = null; }
export async function getCommercialState(companyId: string, userId: string, refresh = false): Promise<Regularization> {
  const key = `${userId}:${companyId}`;
  if (flight?.key === key) return flight.promise;
  if (!refresh && cached?.key === key && elapsed() < cached.validUntil) return cached.data;
  const version = ++epoch;
  const promise = tenantApi<Regularization>(companyId, "/billing/regularization").then(data => {
    if (version !== epoch) throw new Error("O contexto comercial mudou. Tente novamente.");
    if (!data.context || (data.context.companyId ?? data.companyId) !== companyId || (data.companyId != null && data.companyId !== companyId) || typeof data.serverNow !== "string" || typeof data.financial?.requiresAction !== "boolean" || typeof data.trial?.expired !== "boolean" || typeof data.trial.active !== "boolean" || !Number.isInteger(data.trial.remainingDays)) throw new Error("Não foi possível validar o contexto comercial.");
    cached = { key, data, validUntil: elapsed() + Math.min(5000, commercialRevalidationDelay(data)) };
    if (typeof window !== "undefined") window.dispatchEvent(new Event("kalend:commercial-loaded"));
    return data;
  }).finally(() => { if (version === epoch) flight = null; });
  flight = { key, promise };
  return promise;
}
