import { api, jsonBody, withTenantLock } from "../api";
import type { AuthMe } from "../contracts";
export type PushProfile = Pick<AuthMe, "systemRole" | "selectedCompanyId"> & { user: Pick<AuthMe["user"], "id"> };
export type PushState = "unsupported" | "permission-default" | "permission-granted" | "permission-denied" | "subscribed" | "unsubscribed" | "error";
export type Device = {
  id: string; label: string | null; platform: "WEB" | "ANDROID" | "IOS"; active: boolean;
  revokedAt: string | null; expiresAt: string | null;
  authorizations?: { active: boolean; revokedAt: string | null }[];
};
export type PublicConfig = { available: boolean; publicKey: string | null; environment: string | null };
const ROOT = "/communication/push";
export function supported() {
  return typeof window !== "undefined" && window.isSecureContext && typeof Notification !== "undefined" &&
    typeof navigator !== "undefined" && !!navigator.serviceWorker?.ready &&
    typeof PushManager !== "undefined" && typeof PushManager.prototype.subscribe === "function";
}
export function permissionState(): PushState {
  return supported() ? `permission-${Notification.permission}` : "unsupported";
}
export function eligible(profile: PushProfile | null) {
  return !!profile && (!!profile.selectedCompanyId || profile.systemRole === "SUPER_ADMIN");
}
export function activeDevice(device: Device) {
  return device.active && !device.revokedAt && (!device.expiresAt || Date.parse(device.expiresAt) > Date.now()) &&
    (!device.authorizations || device.authorizations.some(grant => grant.active && !grant.revokedAt));
}
export function deviceLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Web";
  return { label: `${browser} — ${os}`, platform: os === "Android" ? "ANDROID" as const : os === "iOS" ? "IOS" as const : "WEB" as const };
}
export async function registration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}
// Persist only a public record ID. Hash the endpoint to identify this browser subscription;
// never persist the subscription, endpoint or encryption keys in application storage.
async function mappingKey(profile: PushProfile, sub: PushSubscription) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub.endpoint));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `kalend:push:${profile.user.id}:${hash}`;
}
async function deviceMapping(key: string, value?: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kalend-push-device", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("records"); };
    request.onerror = () => reject(new Error("Device mapping unavailable"));
    request.onblocked = request.onerror;
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("records", value === undefined ? "readonly" : "readwrite");
      const store = tx.objectStore("records");
      const record = value === undefined ? store.get(key) : store.put(value, key);
      let found: string | null = null;
      record.onsuccess = () => { found = typeof record.result === "string" ? record.result : null; };
      tx.oncomplete = () => { db.close(); resolve(found); };
      tx.onerror = () => { db.close(); reject(new Error("Device mapping unavailable")); };
      tx.onabort = tx.onerror;
    };
  });
}
export async function currentId(profile: PushProfile, sub: PushSubscription) {
  try { return await deviceMapping(await mappingKey(profile, sub)); } catch { return null; }
}
async function remember(profile: PushProfile, sub: PushSubscription, id: string) {
  try { await deviceMapping(await mappingKey(profile, sub), id); } catch { /* Explicit registration still works without storage. */ }
}
export async function inContext<T>(profile: PushProfile | null, work: () => Promise<T>): Promise<T> {
  if (!eligible(profile)) throw new Error(profile ? "Selecione uma empresa para gerenciar notificações." : "Entre para gerenciar notificações.");
  return withTenantLock(async () => {
    const me = await api<AuthMe>("/auth/me");
    if (me.user.id !== profile!.user.id || me.selectedCompanyId !== profile!.selectedCompanyId) throw new Error("A sessão ou empresa mudou. Atualize a página.");
    return work();
  });
}
export const pushApi = {
  config: () => api<PublicConfig>(`${ROOT}/public-config`),
  list: () => api<Device[]>(`${ROOT}/subscriptions`),
  update: (id: string, active: boolean) => api(`${ROOT}/subscriptions/${encodeURIComponent(id)}`, { method: "PUT", ...jsonBody({ active }) }),
  remove: (id: string) => api(`${ROOT}/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
export async function enable(profile: PushProfile, config: PublicConfig) {
  if (!supported()) throw new Error("Este navegador não oferece suporte a Push em conexão segura.");
  if (!eligible(profile)) throw new Error("Selecione uma empresa.");
  if (!config.available || !config.publicKey) throw new Error("Push indisponível no servidor.");
  if (Notification.permission === "denied") throw new Error("Permita notificações nas configurações do navegador.");
  // Called directly from a user click, before asynchronous network/worker operations.
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return null;
  return inContext(profile, async () => {
    const reg = await registration();
    const key = Uint8Array.from(atob(config.publicKey!.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    let sub = await reg.pushManager.getSubscription();
    if (sub?.expirationTime && sub.expirationTime <= Date.now()) { await sub.unsubscribe(); sub = null; }
    if (sub?.options.applicationServerKey && !equalKey(new Uint8Array(sub.options.applicationServerKey), key)) throw new Error("A chave pública mudou. Remova o registro deste dispositivo antes de ativar novamente.");
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const serialized = sub.toJSON();
    const device = await api<Device>(`${ROOT}/subscriptions`, { method: "POST", ...jsonBody({
      provider: "WEB_PUSH", ...deviceLabel(), endpoint: serialized.endpoint, keys: serialized.keys, expirationTime: serialized.expirationTime ?? null,
    }) });
    await remember(profile, sub, device.id);
    return device;
  });
}
function equalKey(a: Uint8Array, b: Uint8Array) { return a.length === b.length && a.every((value, index) => value === b[index]); }

export async function removeDevice(profile: PushProfile, id: string, localId: string | null) {
  return inContext(profile, async () => {
    await pushApi.remove(id);
    if (id === localId) {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub && !await sub.unsubscribe()) throw new Error("Não foi possível remover a subscription do navegador.");
    }
  });
}
