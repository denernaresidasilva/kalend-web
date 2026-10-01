/* No fetch handler or Cache Storage: authenticated pages and API always use the network. */
const FALLBACK = '/conta';
function safeUrl(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : FALLBACK, self.location.origin);
    // Only application destinations; no API, auth redirects or query-string credentials.
    if (url.origin !== self.location.origin || url.username || url.password || url.search || url.hash ||
        !/^\/(?:conta(?:\/)?|super-admin(?:\/[a-zA-Z0-9_-]+)*\/?|)$/.test(url.pathname)) return new URL(FALLBACK, self.location.origin).href;
    return url.href;
  } catch { return new URL(FALLBACK, self.location.origin).href; }
}
function safeImage(value, fallback) {
  return typeof value === 'string' && /^\/icons\/kalend-(192|512|180)\.png$/.test(value) ? value : fallback;
}
self.addEventListener('install', () => { /* Updates wait for the user's action. */ });
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'KALEND_UPDATE' && event.source && new URL(event.source.url).origin === self.location.origin) self.skipWaiting();
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Display a generic notification. */ }
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 200) : 'Kalend';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 3000) : 'Uma atualização está disponível no Kalend.';
  event.waitUntil(self.registration.showNotification(title || 'Kalend', {
    body, icon: safeImage(payload.icon, '/icons/kalend-192.png'),
    badge: safeImage(payload.badge, '/icons/kalend-192.png'), data: { url: safeUrl(payload.url) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safeUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try { const navigated = await client.navigate(url); await (navigated || client).focus(); return; } catch { /* Try another window. */ }
    }
    await self.clients.openWindow(url);
  })());
});
