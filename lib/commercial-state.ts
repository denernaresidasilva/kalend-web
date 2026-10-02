import { tenantApi } from "./api";
import type { Regularization } from "./contracts";

let epoch = 0;
let cached: { key: string; data: Regularization } | null = null;
let failed: { key: string; error: unknown } | null = null;
let flight: { key: string; promise: Promise<Regularization> } | null = null;
export function clearCommercialState() { epoch++; cached = null; failed = null; flight = null; }
export async function getCommercialState(companyId: string, userId: string, refresh = false): Promise<Regularization> {
  const key = `${userId}:${companyId}`;
  if (flight?.key === key) return flight.promise;
  if (!refresh && cached?.key === key) return cached.data;
  if (!refresh && failed?.key === key) throw failed.error;
  const version = ++epoch;
  failed = null;
  cached = null;
  const promise = tenantApi<Regularization>(companyId, "/billing/regularization").then(data => {
    if (version !== epoch) throw new Error("O contexto comercial mudou. Tente novamente.");
    if (!data.context || (data.context.companyId ?? data.companyId) !== companyId || (data.companyId != null && data.companyId !== companyId) || typeof data.serverNow !== "string" || typeof data.financial?.requiresAction !== "boolean" || typeof data.trial?.expired !== "boolean" || typeof data.trial.active !== "boolean" || !Number.isInteger(data.trial.remainingDays)) throw new Error("Não foi possível validar o contexto comercial.");
    cached = { key, data };
    if (typeof window !== "undefined") window.dispatchEvent(new Event("kalend:commercial-loaded"));
    return data;
  }).catch(error => {
    if (version === epoch) failed = { key, error };
    throw error;
  }).finally(() => { if (version === epoch) flight = null; });
  flight = { key, promise };
  return promise;
}
