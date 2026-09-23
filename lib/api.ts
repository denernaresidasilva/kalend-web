// NEXT_PUBLIC_* is embedded at build time; production remains the fallback.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "https://api.kalend.tech").replace(/\/+$/, "");
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
  constructor(public status: number) { super(messages[status] || "Não foi possível conectar ao serviço. Tente novamente."); }
}
let refreshFlight: Promise<void> | null = null;
let generation = 0;
let ended = false;
let channel: BroadcastChannel | undefined;
function syncChannel() {
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" && !channel) {
    channel = new BroadcastChannel("kalend-session");
    channel.onmessage = ({ data }) => {
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
  if (!response.ok) throw new ApiError(response.status);
  return response;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  return response.status === 204 ? undefined as T : response.json();
}
export function jsonBody(value: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}
