/* No fetch handler or Cache Storage: authenticated pages and API always use the network. */
const FALLBACK = '/conta';
function safeUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) throw Error();
    const path = value.startsWith('/') ? value : value.startsWith(self.location.origin + '/') ? value.slice(self.location.origin.length) : '';
    if (!/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/.test(path) || /^\/(?:api|auth|_next)(?:\/|$)/i.test(path)) throw Error();
    const url = new URL(path, self.location.origin);
    if (url.protocol !== 'https:' || url.origin !== self.location.origin) throw Error();
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
  event.waitUntil((async () => {
    const options = {
      body, icon: safeImage(payload.icon, '/icons/kalend-192.png'),
      badge: safeImage(payload.badge, '/icons/kalend-192.png'), data: { url: safeUrl(payload.url) },
    };
    const supportsActions = typeof Notification !== 'undefined' &&
      (typeof Notification.maxActions === 'number' ? Notification.maxActions > 0 : 'actions' in Notification.prototype);
    const action = Array.isArray(payload.actions) && payload.actions.find(a => a && a.action === 'open' && typeof a.title === 'string' && a.title.trim() && a.title.length <= 60 && !/[\r\n]/.test(a.title));
    if (supportsActions && action) options.actions = [{ action: 'open', title: action.title }];
    try { await self.registration.showNotification(title || 'Kalend', options); }
    catch (error) {
      if (!options.actions) throw error;
      delete options.actions;
      await self.registration.showNotification(title || 'Kalend', options);
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) if (new URL(client.url).origin === self.location.origin) client.postMessage({ type: 'KALEND_NOTIFICATION_RECEIVED' });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safeUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(url).origin !== self.location.origin || new URL(client.url).origin !== self.location.origin) continue;
      try { const navigated = await client.navigate(url); await (navigated || client).focus(); return; } catch { /* Try another window. */ }
    }
    await self.clients.openWindow(url);
  })());
});
