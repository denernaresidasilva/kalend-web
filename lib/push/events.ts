import type { PushProfile } from "./client";
let channel: BroadcastChannel | undefined;
function pushChannel() {
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" && !channel) {
    channel = new BroadcastChannel("kalend-push");
    channel.onmessage = ({ data }) => {
      if (data?.type === "push-changed" && typeof data.userId === "string") {
        // Received invalidations are local only; never broadcast them again.
        window.dispatchEvent(new Event("kalend:push-changed"));
      }
    };
  }
  return channel;
}
export function watchPushChanges() { pushChannel(); }
export function notifyPushChanged(profile?: PushProfile) {
  window.dispatchEvent(new Event("kalend:push-changed"));
  // Device revocation is global, so all contexts re-read their authorized API.
  pushChannel()?.postMessage({ type: "push-changed", userId: profile?.user.id ?? "*" });
}
