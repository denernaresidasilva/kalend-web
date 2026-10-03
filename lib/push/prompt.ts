import { activeDevice, currentId, eligible, enable, inContext, pushApi, registration, subscriptionMatchesVapid, supported, type PushProfile } from "./client";

export type PromptStatus = "invite" | "ready" | "hidden" | "context" | "paused" | "error";
// Called once per entry. Never asks permission; granted-only repair reuses the existing registration contract.
export async function inspectPushPrompt(profile: PushProfile): Promise<PromptStatus> {
  if (!supported() || Notification.permission === "denied") return "hidden";
  if (!eligible(profile)) return "context";
  const config = await inContext(profile, () => pushApi.config());
  if (!config.available) return "error";
  if (Notification.permission === "default") return "invite";
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  const id = sub ? await currentId(profile, sub) : null;
  const devices = await inContext(profile, () => pushApi.list());
  const device = devices.find(row => row.id === id);
  // A deliberate pause is a preference, not a missing/revoked subscription. Do not undo it automatically.
  if (device?.active && !device.revokedAt && device.authorizations?.length && !device.authorizations.some(grant => grant.active && !grant.revokedAt)) return "paused";
  if (sub && (!sub.expirationTime || sub.expirationTime > Date.now()) && subscriptionMatchesVapid(sub, config) && device && activeDevice(device) && device.registeredInCurrentSession === true) return "ready";
  await enable(profile, config);
  return "ready";
}

// Invoke directly from the button. Permission is requested before any asynchronous API call.
export async function activatePushPrompt(profile: PushProfile): Promise<PromptStatus> {
  if (!supported() || Notification.permission === "denied") return "hidden";
  if (!eligible(profile)) return "context";
  if (Notification.permission === "default" && await Notification.requestPermission() !== "granted") return "hidden";
  const config = await inContext(profile, () => pushApi.config());
  await enable(profile, config);
  window.dispatchEvent(new Event("kalend:push-changed"));
  return "ready";
}

// Origin-wide lock: one invitation/repair across tabs, no storage, cooldown or attempt limit.
export async function withPushPromptLock(work: () => Promise<void>): Promise<void> {
  if (navigator.locks) {
    await navigator.locks.request("kalend:web-push-prompt", { ifAvailable: true }, async lock => { if (lock) await work(); });
  } else if (document.visibilityState === "visible" && document.hasFocus()) {
    // Older engines: only the focused document may invite; no persistent dismissal.
    await work();
  }
}
