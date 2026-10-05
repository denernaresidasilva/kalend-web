import { parseCommercialIssue, type CommercialIssue } from "./commercial-errors";
// Public API base is supplied at build time. Never fall back to production.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "").replace(/\/+$/, "");
const messages: Record<number, string> = {
  400: "Confira os campos informados e tente novamente.",
  401: "Sessão encerrada. Entre novamente.",
  403: "Acesso não autorizado. Verifique sua permissão e a origem de acesso.",
  404: "Registro não encontrado.",
  409: "A operação conflita com o estado atual do registro.",
  422: "Confira os campos informados e tente novamente.",
  429: "Muitas tentativas. Aguarde antes de tentar novamente.",
  500: "Não foi possível concluir a operação. Tente novamente mais tarde.",
  503: "Serviço ou integração indisponível. Tente novamente mais tarde.",
};
export class ApiError extends Error {
  constructor(public status: number, public issue?: CommercialIssue) { super(issue ? (issue.code === "PLAN_LIMIT_REACHED" ? "O limite do plano foi atingido." : issue.code === "SUBSCRIPTION_REQUIRED" ? "Sua assinatura precisa de regularização." : "Recurso indisponível no plano atual.") : messages[status] || "Não foi possível conectar ao serviço. Tente novamente."); }
}
let refreshFlight: Promise<void> | null = null;
let generation = 0;
let ended = false;
let channel: BroadcastChannel | undefined;
function syncChannel() {
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" && !channel) {
    channel = new BroadcastChannel("kalend-session");
    channel.onmessage = ({ data }) => {
      if (data === "tenant-changed" && typeof window !== "undefined") window.dispatchEvent(new Event("kalend:tenant-changed"));
      if (data === "refreshed") generation++;
      if (data === "ended") endSession(false);
      if (data === "signed-in") { ended = false; generation++; window.dispatchEvent(new Event("kalend:signed-in")); }
    };
  }
  return channel;
}
export function endSession(broadcast = true) {
  ended = true;
  if (broadcast) syncChannel()?.postMessage("ended");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kalend:session-ended"));
}
export function sessionStarted() {
  ended = false;
  generation++;
  syncChannel()?.postMessage("signed-in");
}
async function transport(path: string, init: RequestInit = {}) {
  if (!API_URL) throw new Error("Configure NEXT_PUBLIC_API_URL para conectar à API DEV.");
  try {
    return await fetch(`${API_URL}${path}`, { ...init, credentials: "include", cache: "no-store" });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0);
  }
}
async function refresh(observed: number) {
  if (ended) throw new ApiError(401);
  if (observed !== generation) return;
  if (!refreshFlight) {
    const rotate = async () => {
      if (ended) throw new ApiError(401);
      if (observed !== generation) return;
      // A tab may have rotated while we waited for the shared lock. Probe access first.
      const probe = await transport("/auth/me");
      if (probe.ok) return;
      if (probe.status !== 401) throw new ApiError(probe.status);
      const response = await transport("/auth/refresh", { method: "POST" });
      if (!response.ok) throw new ApiError(response.status);
      generation++;
      syncChannel()?.postMessage("refreshed");
    };
    // Without cross-tab locks, fail closed instead of risking refresh replay.
    refreshFlight = (typeof navigator !== "undefined" && navigator.locks
      ? Promise.resolve(navigator.locks.request("kalend-session-rotation", rotate)).then(() => undefined)
      : Promise.reject(new ApiError(401)))
      .catch((error) => { endSession(); throw error; })
      .finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
}
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid API path");
  syncChannel();
  const observed = generation;
  const canRefresh = !["/auth/login", "/auth/refresh", "/auth/logout", "/auth/logout-all", "/plans/public"].includes(path);
  const authMutation = ["/auth/login", "/auth/logout", "/auth/logout-all"].includes(path);
  let response = authMutation && typeof navigator !== "undefined" && navigator.locks
    ? await navigator.locks.request("kalend-session-rotation", () => transport(path, init))
    : await transport(path, init);
  if (response.status === 401 && canRefresh) {
    await refresh(observed);
    response = await transport(path, init);
    if (response.status === 401) endSession();
  }
  if (!response.ok) {
    const issue = response.status === 403 ? parseCommercialIssue(await response.json().catch(() => null)) : undefined;
    if (issue && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kalend:commercial-issue", { detail: issue }));
    throw new ApiError(response.status, issue);
  }
  return response;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  return response.status === 204 ? undefined as T : response.json();
}
export function jsonBody(value: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}

export function tenantChanged() {
  syncChannel()?.postMessage("tenant-changed");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("kalend:tenant-changed"));
}
// Serialize tenant selection and commercial requests across tabs, without transmitting credentials.
export async function withTenantLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) throw new Error("Use um navegador compatível com sessões seguras para gerenciar a assinatura.");
  return navigator.locks.request("kalend-tenant-context", work);
}
export async function tenantApi<T>(companyId: string, path: string, init?: RequestInit, expectedUserId?: string): Promise<T> {
  return withTenantLock(async () => {
    const tenant = await api<{ selectedCompanyId: string | null; user: { id: string } }>("/auth/me");
    if (!companyId || (expectedUserId !== undefined && tenant.user.id !== expectedUserId)) { tenantChanged(); throw new Error("A sessão mudou. Atualize a página antes de continuar."); }
    if (tenant.selectedCompanyId !== companyId) { tenantChanged(); throw new Error("A empresa selecionada mudou em outra aba. Atualize a página."); }
    return api<T>(path, init);
  });
}
