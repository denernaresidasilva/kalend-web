/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
function load(file, mocks = {}, globals = {}) {
  const loaded = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { module: loaded, exports: loaded.exports, require: id => mocks[id] || require(id), Uint8Array, TextEncoder, crypto: webcrypto, atob, Date, ...globals });
  return loaded.exports;
}
const profile = { user: { id: 'user-a' }, systemRole: 'USER', selectedCompanyId: 'company-a' };
const config = { available: true, publicKey: Buffer.alloc(65, 4).toString('base64url') };
function fixture(options = {}) {
  const calls = []; let permissions = 0; let subscribes = 0; let unsubscribes = 0;
  const storage = new Map();
  const sub = { endpoint: 'https://push.example.test/fixture-device', expirationTime: null, options: {}, toJSON: () => ({ endpoint: 'https://push.example.test/fixture-device', keys: { p256dh: 'fixture-key', auth: 'fixture-auth' } }), unsubscribe: async () => { unsubscribes++; return true; } };
  let local = options.existing ? sub : null;
  const reg = { pushManager: { getSubscription: async () => local, subscribe: async () => { subscribes++; return local = sub; } } };
  const notification = { permission: options.permission || 'granted', requestPermission: async () => { permissions++; notification.permission = options.choice || 'granted'; return notification.permission; } };
  const globals = {
    window: { isSecureContext: true }, Notification: notification,
    PushManager: class { subscribe() {} }, navigator: { userAgent: 'Chrome/130 Linux', serviceWorker: { ready: Promise.resolve(reg), register: async (...args) => { calls.push(['worker', ...args]); return reg; } } },
    indexedDB: { open: () => {
      const request = {};
      const db = { close() {}, transaction: () => {
        const tx = { objectStore: () => ({
          get: key => operation(storage.get(key)),
          put: (value, key) => { storage.set(key, value); return operation(key); },
        }) };
        function operation(value) { const record = { result: value }; queueMicrotask(() => { record.onsuccess(); tx.oncomplete(); }); return record; }
        return tx;
      } };
      queueMicrotask(() => { request.result = db; request.onsuccess(); }); return request;
    } }, ...options.globals,
  };
  const api = async (path, init) => {
    calls.push([path, init]);
    if (path === '/auth/me') return options.me || profile;
    if (options.apiError) throw new Error('fixture failure');
    if (path.endsWith('/public-config')) return config;
    if (path.endsWith('/subscriptions') && !init) return [{ id: 'other-device', active: true }];
    return { id: 'current-device', active: true };
  };
  const client = load('lib/push/client.ts', { '../api': { api, jsonBody: body => ({ body: JSON.stringify(body) }), withTenantLock: async fn => fn() } }, globals);
  return { client, sub, storage, calls, notification, stats: () => ({ permissions, subscribes, unsubscribes }) };
}
for (const [name, globals] of [ ['PushManager', { PushManager: undefined }], ['Notification', { Notification: undefined }], ['ServiceWorker', { navigator: {} }], ['subscribe', { PushManager: class {} }], ['secure context', { window: { isSecureContext: false } }], ['ready', { navigator: { serviceWorker: {} } }] ]) {
  test(`unsupported without ${name}`, () => { const f = fixture({ globals }); assert.equal(f.client.supported(), false); assert.equal(f.client.permissionState(), 'unsupported'); });
}
for (const permission of ['default', 'granted', 'denied']) test(`permission ${permission}`, () => assert.equal(fixture({ permission }).client.permissionState(), `permission-${permission}`));
test('default requests permission only on explicit enable and then subscribes/posts exact contract', async () => {
  const f = fixture({ permission: 'default' }); assert.equal(f.stats().permissions, 0);
  await f.client.enable(profile, config);
  assert.equal(f.stats().permissions, 1); assert.equal(f.stats().subscribes, 1);
  const post = f.calls.find(([path, init]) => path.endsWith('/subscriptions') && init?.method === 'POST');
  assert.deepEqual(JSON.parse(post[1].body), { provider: 'WEB_PUSH', platform: 'WEB', label: 'Chrome — Linux', endpoint: f.sub.endpoint, keys: f.sub.toJSON().keys, expirationTime: null });
  assert.equal(await f.client.currentId(profile, f.sub), 'current-device');
  assert.doesNotMatch(JSON.stringify([...f.storage]), /fixture-device|fixture-key|fixture-auth/);
});
test('existing local subscription is reused; other devices never updated', async () => {
  const f = fixture({ existing: true }); await f.client.enable(profile, config); await f.client.enable(profile, config);
  assert.equal(f.stats().subscribes, 0); assert.equal(f.stats().permissions, 0);
  assert.equal(f.calls.filter(([, init]) => init?.method === 'PUT' || init?.method === 'DELETE').length, 0);
});
test('denied never prompts or calls API', async () => {
  const f = fixture({ permission: 'denied' }); await assert.rejects(f.client.enable(profile, config));
  assert.equal(f.stats().permissions, 0); assert.equal(f.calls.length, 0);
});
test('dismissed prompt never subscribes or registers', async () => {
  const f = fixture({ permission: 'default', choice: 'default' }); assert.equal(await f.client.enable(profile, config), null); assert.equal(f.calls.length, 0);
});
test('missing authentication/company fail closed', async () => {
  const f = fixture();
  for (const me of [null, { ...profile, selectedCompanyId: null }]) await assert.rejects(f.client.inContext(me, () => f.client.pushApi.list()));
  assert.equal(f.calls.length, 0);
});
test('changed user/company session blocks registration and mutations', async () => {
  for (const me of [{ ...profile, user: { id: 'other-user' } }, { ...profile, selectedCompanyId: 'company-b' }]) {
    const f = fixture({ me }); await assert.rejects(f.client.enable(profile, config)); assert.equal(f.stats().subscribes, 0);
    assert.deepEqual(f.calls.map(([path]) => path), ['/auth/me']);
  }
});
test('super admin without company uses current session context', async () => {
  const me = { ...profile, selectedCompanyId: null, systemRole: 'SUPER_ADMIN' }; const f = fixture({ me });
  await f.client.inContext(me, () => f.client.pushApi.list()); assert.ok(f.calls.some(([path]) => path.endsWith('/subscriptions')));
});
test('config unavailable blocks permission request', async () => {
  const f = fixture({ permission: 'default' }); await assert.rejects(f.client.enable(profile, { available: false })); assert.equal(f.stats().permissions, 0);
});
test('API error keeps subscription for safe registration retry', async () => {
  const f = fixture({ apiError: true }); await assert.rejects(f.client.enable(profile, config)); assert.equal(f.stats().unsubscribes, 0); assert.equal(f.storage.size, 0);
});
test('PUT updates consent and DELETE revokes only the specified record', async () => {
  const f = fixture(); await f.client.inContext(profile, async () => { await f.client.pushApi.update('record-a', false); await f.client.pushApi.update('record-a', true); await f.client.pushApi.remove('record-a'); });
  const calls = f.calls.filter(([, init]) => init);
  assert.deepEqual(calls.map(([path, init]) => [path, init.method, init.body]), [ ['/communication/push/subscriptions/record-a', 'PUT', '{"active":false}'], ['/communication/push/subscriptions/record-a', 'PUT', '{"active":true}'], ['/communication/push/subscriptions/record-a', 'DELETE', undefined] ]);
});
test('company grants, expired and revoked subscriptions affect active state', () => {
  const { client } = fixture();
  assert.equal(client.activeDevice({ active: true }), true);
  for (const row of [{ active: false }, { active: true, revokedAt: 'now' }, { active: true, expiresAt: '2000-01-01' }, { active: true, authorizations: [{ active: false, revokedAt: null }] }]) assert.equal(client.activeDevice(row), false);
});
function worker(options = {}) {
  const handlers = {}; const shown = []; const opened = []; let windows = []; let claims = 0; let skips = 0;
  const self = { location: { origin: 'https://dev.kalend.tech' }, addEventListener: (name, fn) => handlers[name] = fn, registration: { showNotification: async (...args) => { if (options.rejectActions && args[1].actions) throw Error('Actions unsupported'); shown.push(args); } }, skipWaiting: () => skips++, clients: { claim: async () => claims++, matchAll: async () => windows, openWindow: async url => opened.push(url) } };
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), { self, URL, Notification: { maxActions: options.maxActions ?? 0, prototype: {} } });
  async function emit(name, extras = {}) { let work; handlers[name]({ waitUntil: promise => work = promise, ...extras }); await work; }
  return { emit, handlers, shown, opened, setWindows: value => windows = value, stats: () => ({ claims, skips }) };
}
test('worker installs/activates; caches no page/API; update requires same-origin client', async () => {
  const w = worker(); await w.emit('install'); await w.emit('activate'); assert.equal(w.stats().claims, 1); assert.equal(w.handlers.fetch, undefined);
  await w.emit('message', { data: { type: 'KALEND_UPDATE' }, source: { url: 'https://evil.test/' } }); assert.equal(w.stats().skips, 0);
  await w.emit('message', { data: { type: 'KALEND_UPDATE' }, source: { url: 'https://dev.kalend.tech/conta' } }); assert.equal(w.stats().skips, 1);
});
test('push renders plain title/body and local images', async () => {
  const w = worker(); await w.emit('push', { data: { json: () => ({ title: '<script>fixture</script>', body: 'Body', icon: 'https://evil.test/pixel', url: '/super-admin/comunicacao' }) } });
  assert.equal(w.shown[0][0], '<script>fixture</script>'); assert.equal(w.shown[0][1].body, 'Body'); assert.equal(w.shown[0][1].icon, '/icons/kalend-192.png'); assert.equal(w.shown[0][1].data.url, 'https://dev.kalend.tech/super-admin/comunicacao');
});
test('empty/malformed push still displays generic notification', async () => {
  const w = worker(); await w.emit('push'); await w.emit('push', { data: { json() { throw Error(); } } }); assert.equal(w.shown.length, 2);
});
for (const url of ['http://evil.test/', '//evil.test/', 'javascript:alert(1)', '/auth/redirect', '/api/private', '/conta?token=fixture', '/conta#token', 'https://user:pass@dev.kalend.tech/conta']) test(`notification blocks URL ${url}`, async () => {
  const w = worker(); await w.emit('notificationclick', { notification: { close() {}, data: { url } } }); assert.deepEqual(w.opened, ['https://dev.kalend.tech/conta']);
});
test('notification click navigates/focuses existing Kalend and closes notification', async () => {
  const w = worker(); let closed = 0; let focused = 0; let navigated;
  w.setWindows([{ url: 'https://evil.test', navigate: () => assert.fail() }, { url: 'https://dev.kalend.tech/', navigate: async url => { navigated = url; return { focus: async () => focused++ }; } }]);
  await w.emit('notificationclick', { notification: { close: () => closed++, data: { url: '/conta' } } }); assert.equal(closed, 1); assert.equal(focused, 1); assert.equal(navigated, 'https://dev.kalend.tech/conta'); assert.equal(w.opened.length, 0);
});
test('install button becomes available only with beforeinstallprompt; installation clears it', async () => {
  const events = {}; const changes = []; let prompt = 0;
  const mod = load('lib/push/install.ts', {}, { window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener: (key, fn) => events[key] = fn, removeEventListener: key => delete events[key] }, navigator: { userAgent: 'Chrome' } });
  const cleanup = mod.watchInstall((...args) => changes.push(args)); assert.equal(changes[0][0], null);
  let prevented = false; const event = { preventDefault: () => prevented = true, prompt: async () => prompt++, userChoice: Promise.resolve({ outcome: 'accepted' }) };
  events.beforeinstallprompt(event); assert.equal(prevented, true); assert.equal(changes.at(-1)[0], event); await changes.at(-1)[0].prompt(); assert.equal(prompt, 1);
  events.appinstalled(); assert.equal(changes.at(-1)[0], null); cleanup(); assert.equal(Object.keys(events).length, 0);
});
test('already-installed iOS hides installation UX', () => {
  let value;
  const mod = load('lib/push/install.ts', {}, { window: { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} }, navigator: { userAgent: 'iPhone', standalone: true } });
  mod.watchInstall((...args) => value = args); assert.deepEqual(value, [null, false]);
});
test('manifest and PNG icons preserve existing identity and correct dimensions', () => {
  const manifest = load('app/manifest.ts').default(); assert.equal(manifest.scope, '/'); assert.equal(manifest.start_url, '/conta'); assert.equal(manifest.display, 'standalone'); assert.equal(manifest.name, 'Kalend');
  for (const size of [180,192,512]) { const png = fs.readFileSync(`public/icons/kalend-${size}.png`); assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size); }
});
test('Push sources contain no credentials, logs or second HTTP transport', () => {
  for (const file of ['lib/push/client.ts', 'lib/push/install.ts', 'public/sw.js', 'components/push-settings.tsx', 'components/pwa-provider.tsx']) {
    const source = fs.readFileSync(file, 'utf8'); assert.doesNotMatch(source, /console\.|privateKey|PRIVATE_KEY|accessToken|refreshToken|document\.cookie|fetch\(/);
  }
});

test('removing current device revokes backend before unsubscribing browser; remote devices preserve local subscription', async () => {
  const f = fixture({ existing: true });
  await f.client.removeDevice(profile, 'remote-device', 'current-device'); assert.equal(f.stats().unsubscribes, 0);
  await f.client.removeDevice(profile, 'current-device', 'current-device'); assert.equal(f.stats().unsubscribes, 1);
  const failed = fixture({ existing: true, apiError: true });
  await assert.rejects(failed.client.removeDevice(profile, 'current-device', 'current-device')); assert.equal(failed.stats().unsubscribes, 0);
});
test('expired local subscription is replaced only during explicit registration', async () => {
  const f = fixture({ existing: true }); f.sub.expirationTime = 1;
  await f.client.enable(profile, config); assert.equal(f.stats().unsubscribes, 1); assert.equal(f.stats().subscribes, 1);
});
test('failed expired subscription removal blocks replacement and server registration', async () => {
  const f = fixture({ existing: true }); f.sub.expirationTime = 1; f.sub.unsubscribe = async () => false;
  await assert.rejects(f.client.enable(profile, config), /inscrição expirada/);
  assert.equal(f.stats().subscribes, 0);
  assert.equal(f.calls.filter(([, init]) => init?.method === 'POST').length, 0);
});
test('queued self-test accepts only idempotency ID and uses authenticated tenant context', async () => {
  const f = fixture();
  await f.client.inContext(profile, () => f.client.pushApi.test('fixture-request-id'));
  const post = f.calls.find(([path]) => path.endsWith('/test'));
  assert.equal(post[1].method, 'POST');
  assert.deepEqual(JSON.parse(post[1].body), { requestId: 'fixture-request-id' });
  const changed = fixture({ me: { ...profile, selectedCompanyId: 'company-b' } });
  await assert.rejects(changed.client.inContext(profile, () => changed.client.pushApi.test('fixture-request-id')));
  assert.equal(changed.calls.some(([path]) => path.endsWith('/test')), false);
});
test('changed VAPID key does not silently replace existing browser subscription', async () => {
  const f = fixture({ existing: true }); f.sub.options.applicationServerKey = new Uint8Array([1,2,3]).buffer;
  await assert.rejects(f.client.enable(profile, config)); assert.equal(f.stats().unsubscribes, 0); assert.equal(f.stats().subscribes, 0);
});
test('public VAPID is checked against the browser subscription when available', () => {
  const f = fixture({ existing: true });
  f.sub.options.applicationServerKey = Uint8Array.from(Buffer.alloc(65, 4)).buffer;
  assert.equal(f.client.subscriptionMatchesVapid(f.sub, config), true);
  f.sub.options.applicationServerKey = new Uint8Array([1, 2, 3]).buffer;
  assert.equal(f.client.subscriptionMatchesVapid(f.sub, config), false);
  assert.equal(f.client.subscriptionMatchesVapid(f.sub, { ...config, publicKey: null }), false);
});

for (const url of ['/agenda/agendamento/123', '/conta/notificacoes']) test(`notification main click and action open safe destination ${url}`, async () => {
  for (const action of ['', 'open']) {
    const w = worker({ maxActions: 1 });
    await w.emit('push', { data: { json: () => ({ title: 'Agendamento', body: 'Maria', url, actions: [{ action: 'open', title: 'VER AGENDAMENTO' }] }) } });
    assert.deepEqual(JSON.parse(JSON.stringify(w.shown[0][1].actions)), [{ action: 'open', title: 'VER AGENDAMENTO' }]);
    await w.emit('notificationclick', { action, notification: { close() {}, data: w.shown[0][1].data } });
    assert.deepEqual(w.opened, [new URL(url, 'https://dev.kalend.tech').href]);
  }
});
for (const options of [{ maxActions: 0 }, { maxActions: 1, rejectActions: true }]) test(`notification remains clickable without actions ${JSON.stringify(options)}`, async () => {
  const w = worker(options);
  await w.emit('push', { data: { json: () => ({ title: 'Kalend', body: 'Atualização', url: '/agenda/123', actions: [{ action: 'open', title: 'VER' }] }) } });
  assert.equal(w.shown.length, 1); assert.equal(w.shown[0][1].actions, undefined);
  await w.emit('notificationclick', { notification: { close() {}, data: w.shown[0][1].data } });
  assert.deepEqual(w.opened, ['https://dev.kalend.tech/agenda/123']);
});
test('external notification uses internal fallback and never navigates externally', async () => {
  const w = worker(); w.setWindows([{ url: 'https://dev.kalend.tech/conta', navigate: async url => { assert.equal(url, 'https://dev.kalend.tech/conta'); throw Error('fixture'); } }]);
  await w.emit('notificationclick', { notification: { close() {}, data: { url: 'https://exemplo.com/' } } });
  assert.deepEqual(w.opened, ['https://dev.kalend.tech/conta']);
});
