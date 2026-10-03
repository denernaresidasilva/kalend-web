import { activeDevice, currentId, eligible, enable, inContext, pushApi, registration, subscriptionMatchesVapid, supported, type PublicConfig, type PushProfile } from "./client";

export type PromptStatus = "invite" | "ready" | "hidden" | "context" | "paused" | "error";
// Called once per entry. Never asks permission; granted-only repair reuses the existing registration contract.
export async function inspectPushPrompt(profile: PushProfile): Promise<PromptStatus> {
  if (!supported() || Notification.permission === "denied") return "hidden";
  if (!eligible(profile)) return "context";
  const config = await inContext(profile, () => pushApi.config());
  if (!config.available || !config.publicKey) return "error";
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

// The modal prepares config before the click, preserving the permission user gesture.
export async function activatePushPrompt(profile: PushProfile, preparedConfig?: PublicConfig): Promise<PromptStatus> {
  if (!supported() || Notification.permission === "denied") return "hidden";
  if (!eligible(profile)) return "context";
  const config = preparedConfig ?? await inContext(profile, () => pushApi.config());
  if (!config.available || !config.publicKey) return "error";
  const device = await enable(profile, config);
  if (!device) return "hidden";
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
