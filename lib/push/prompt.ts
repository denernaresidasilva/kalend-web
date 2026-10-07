import { eligible, enable, evaluatePush, inContext, pushApi, supported, type PublicConfig, type PushProfile, type PushStatus } from "./client";
import { notifyPushChanged } from "./events";

export type PromptStatus = "invite" | "ready" | "hidden" | "context" | "paused" | "error";
function promptStatus(status: PushStatus): PromptStatus {
  switch (status) {
    case "activated": return "ready";
    case "needs_registration": return "invite";
    case "paused": return "paused";
    case "context": return "context";
    case "blocked": return "hidden";
    default: return "error";
  }
}
// Probing never grants or restores consent. Registration requires a user action.
export async function inspectPushPrompt(profile: PushProfile): Promise<PromptStatus> {
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return "hidden";
  const status = promptStatus((await evaluatePush(profile)).status);
  return status === "invite" && typeof Notification !== "undefined" && Notification.permission === "granted" ? "hidden" : status;
}

// Prepared configuration preserves the permission request's user gesture.
export async function activatePushPrompt(profile: PushProfile, preparedConfig?: PublicConfig): Promise<PromptStatus> {
  if (!supported() || Notification.permission === "denied") return "hidden";
  if (!eligible(profile)) return "context";
  if (Notification.permission === "granted") {
    const before = await evaluatePush(profile);
    if (before.status === "activated") return "ready";
    if (["error", "unavailable", "context", "blocked"].includes(before.status)) return promptStatus(before.status);
  }
  const config = preparedConfig ?? await inContext(profile, () => pushApi.config());
  if (!config.available || !config.publicKey) return "error";
  if (!await enable(profile, config)) return "hidden";
  const final = await evaluatePush(profile);
  if (final.status === "activated") notifyPushChanged(profile);
  return promptStatus(final.status);
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
