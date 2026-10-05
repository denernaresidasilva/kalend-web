// Serialize local subscription mutations and logout cleanup across tabs.
let cleanup: Promise<void> = Promise.resolve();
export async function withPushLifecycle<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("kalend-push-lifecycle", work);
  }
  const operation = cleanup.catch(() => {}).then(work);
  cleanup = operation.then(() => {}, () => {});
  return operation;
}
export function clearLocalPush(): Promise<void> {
  // Capture the old subscription immediately: a delayed logout must never remove
  // a replacement subscription created by a subsequent login.
  const old = navigator.serviceWorker?.getRegistration("/").then(async reg => ({
    reg, sub: await reg?.pushManager?.getSubscription(),
  }));
  cleanup = withPushLifecycle(async () => {
    const captured = await old;
    if (!captured?.reg) return;
    for (const notification of await captured.reg.getNotifications()) notification.close();
    if (captured.sub && !await captured.sub.unsubscribe()) throw new Error("PUSH_LOCAL_CLEANUP_FAILED");
  });
  return cleanup;
}
