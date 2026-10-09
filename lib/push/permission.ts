export type PushPermission = NotificationPermission | "unsupported";
export function readPushPermission(): PushPermission {
  if (typeof Notification === "undefined") return "unsupported";
  const permission = Notification.permission;
  return permission === "default" || permission === "granted" || permission === "denied" ? permission : "unsupported";
}
// Consent invitation is independent of subscription/backend registration.
export function canInvitePush(permission: PushPermission, dismissed = false) {
  return permission === "default" && !dismissed;
}
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
export function subscribePushPermission(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    let alive = true;
    let observed: PermissionStatus | undefined;
    let previous = readPushPermission();
    const changed = () => {
      const current = readPushPermission();
      if (current === previous) return;
      previous = current;
      for (const notify of listeners) notify();
      window.dispatchEvent(new Event("kalend:push-permission-changed"));
    };
    const visible = () => { if (document.visibilityState === "visible") changed(); };
    window.addEventListener("focus", changed);
    window.addEventListener("kalend:push-changed", changed);
    document.addEventListener("visibilitychange", visible);
    // Some browsers cannot query/observe notification permission. Poll only the
    // local permission while visible; never request consent, subscribe or call API.
    const timer = setInterval(visible, 250);
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: "notifications" }).then(status => {
        if (!alive) return;
        observed = status;
        status.addEventListener("change", changed);
        changed();
      }).catch(() => {});
    }
    stop = () => {
      alive = false;
      clearInterval(timer);
      observed?.removeEventListener("change", changed);
      window.removeEventListener("focus", changed);
      window.removeEventListener("kalend:push-changed", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { stop?.(); stop = undefined; }
  };
}
