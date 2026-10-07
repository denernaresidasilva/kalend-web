/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto, createHash } = require('node:crypto');
function load(file, mocks, globals) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: id => mocks[id] || require(id), crypto: webcrypto, TextEncoder, Uint8Array, atob, Date, Event, setTimeout, clearTimeout, ...globals });
  return mod.exports;
}
function fixture(options = {}) {
  const profile = { user: { id: 'user-a' }, systemRole: 'USER', selectedCompanyId: 'company-a' };
  const config = { available: true, publicKey: Buffer.alloc(65, 4).toString('base64url'), environment: 'SANDBOX' };
  const sub = { endpoint: 'https://push.example.test/current', expirationTime: null,
    options: { applicationServerKey: Uint8Array.from(Buffer.alloc(65, 4)).buffer },
    toJSON: () => ({ endpoint: sub.endpoint, keys: { p256dh: 'fixture', auth: 'fixture' } }),
    unsubscribe: async () => { local = null; return true; },
  };
  let local = options.noSubscription ? null : sub;
  const hash = createHash('sha256').update(sub.endpoint).digest('hex');
  const device = { id: 'device-a', endpointHash: hash, vapidPublicKey: config.publicKey, environment: 'SANDBOX',
    active: true, revokedAt: null, expiresAt: null, authorizations: [{ active: true, revokedAt: null }], ...options.device };
  let rows = options.missing ? [] : [device];
  let me = profile;
  const calls = [], events = [], storage = new Map();
  const reg = { pushManager: { getSubscription: async () => local, subscribe: async () => local = sub } };
  const globals = {
    window: { isSecureContext: true, dispatchEvent: event => events.push(event.type) },
    navigator: { userAgent: 'Chrome/130 Linux', serviceWorker: { ready: Promise.resolve(reg), register: async () => reg } },
    Notification: { permission: options.permission || 'granted', requestPermission: async () => globals.Notification.permission = 'granted' },
    PushManager: class { subscribe() {} },
    indexedDB: { open: () => {
      const req = {};
      queueMicrotask(() => {
        if (options.noStorage) { req.onerror(); return; }
        req.result = { close() {}, transaction: () => {
          const tx = { objectStore: () => ({ get: key => op(storage.get(key)), put: (value, key) => { storage.set(key, value); return op(key); } }) };
          function op(value) { const record = { result: value }; queueMicrotask(() => { record.onsuccess(); tx.oncomplete(); }); return record; }
          return tx;
        } }; req.onsuccess();
      }); return req;
    } },
  };
  const api = async (path, init) => {
    calls.push([path, init?.method]);
    if (path === '/auth/me') return me;
    if (options.apiError) throw Error('offline');
    if (path.endsWith('public-config')) return config;
    if (init?.method === 'POST') {
      if (!options.postWithoutPersistence) rows = [{ ...device, active: true, revokedAt: null, authorizations: [{ active: true, revokedAt: null }] }];
      return device;
    }
    if (path.includes('/subscriptions')) return rows;
    throw Error('unexpected route');
  };
  const client = load('lib/push/client.ts', { '../api': { api, jsonBody: body => ({ body: JSON.stringify(body) }), withTenantLock: async fn => fn() }, './lifecycle': { withPushLifecycle: async fn => fn() }, './events': { notifyPushChanged: () => events.push('kalend:push-changed') } }, globals);
  const prompt = load('lib/push/prompt.ts', { './client': client, './events': { notifyPushChanged: () => events.push('kalend:push-changed') } }, globals);
  return { client, prompt, profile, config, device, sub, storage, calls, events, globals, setMe: value => me = value };
}
test('real shared evaluation recognizes active API contract without session field and restores mapping', async () => {
  const f = fixture();
  assert.equal(await f.client.currentId(f.profile, f.sub), null);
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'activated');
  assert.equal(await f.client.currentId(f.profile, f.sub), f.device.id);
  assert.equal(await f.prompt.inspectPushPrompt(f.profile), 'ready');
  assert.equal(f.calls.some(([, method]) => method === 'POST'), false);
  assert.equal(f.calls.some(([path]) => path.includes('?endpointHash=' + f.device.endpointHash)), true);
});
for (const [options, status] of [
  [{ permission: 'default' }, 'needs_registration'], [{ permission: 'denied' }, 'blocked'],
  [{ missing: true }, 'needs_registration'], [{ noSubscription: true }, 'needs_registration'],
  [{ device: { authorizations: [{ active: false, revokedAt: null }] } }, 'paused'],
  [{ device: { authorizations: [{ active: true, revokedAt: '2026-01-01' }] } }, 'paused'],
  [{ device: { active: false, revokedAt: '2026-01-01' } }, 'paused'],
  [{ device: { expiresAt: '2000-01-01' } }, 'needs_registration'],
  [{ device: { environment: 'PRODUCTION' } }, 'unavailable'],
  [{ device: { vapidPublicKey: 'another-key' } }, 'needs_registration'],
  [{ device: { endpointHash: '0'.repeat(64) } }, 'needs_registration'],
  [{ device: { authorizations: [] } }, 'needs_registration'],
  [{ apiError: true }, 'error'], [{ noStorage: true }, 'activated'],
]) test(`evaluation ${JSON.stringify(options)} -> ${status}`, async () => {
  const f = fixture(options); assert.equal((await f.client.evaluatePush(f.profile)).status, status);
  assert.equal(f.calls.some(([, method]) => method === 'POST'), false);
});
test('lost IndexedDB preserves paused consent during repeated popup inspection', async () => {
  const f = fixture({ device: { authorizations: [{ active: false, revokedAt: null }] }, noStorage: true });
  assert.equal(await f.prompt.inspectPushPrompt(f.profile), 'paused');
  assert.equal(await f.prompt.inspectPushPrompt(f.profile), 'paused');
  assert.equal(f.calls.some(([, method]) => method === 'POST'), false);
  assert.deepEqual(f.events, []);
});
test('expired subscription requires registration but paused consent takes precedence', async () => {
  const f = fixture(); f.sub.expirationTime = 1;
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'needs_registration');
  f.device.authorizations[0].active = false;
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'paused');
});
test('zero expiration time is expired, not an absent expiry', async () => {
  const f = fixture(); f.sub.expirationTime = 0;
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'needs_registration');
});
test('different or unknown browser VAPID never confirms activation', async () => {
  for (const key of [new Uint8Array([1, 2]).buffer, undefined]) {
    const f = fixture(); f.sub.options.applicationServerKey = key;
    assert.equal((await f.client.evaluatePush(f.profile)).status, 'error');
    assert.equal(await f.prompt.activatePushPrompt(f.profile), 'error');
    assert.equal(f.calls.some(([, method]) => method === 'POST'), false);
  }
});
test('context change and unauthorized membership errors cannot activate', async () => {
  const f = fixture(); f.setMe({ ...f.profile, selectedCompanyId: 'company-b' });
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'error');
  assert.equal(f.calls.some(([path]) => path.includes('subscriptions')), false);
  assert.equal((await f.client.evaluatePush({ ...f.profile, selectedCompanyId: null })).status, 'context');
});
test('activation confirms fresh GET after POST before notifying and skips repeated registration', async () => {
  const f = fixture({ missing: true });
  assert.equal(await f.prompt.activatePushPrompt(f.profile, f.config), 'ready');
  const post = f.calls.findIndex(([, method]) => method === 'POST');
  assert.ok(f.calls.slice(post + 1).some(([path]) => path.includes('/subscriptions?')));
  assert.deepEqual(f.events, ['kalend:push-changed']);
  assert.equal((await f.client.evaluatePush(f.profile)).status, 'activated');
  assert.equal(await f.prompt.activatePushPrompt(f.profile), 'ready');
  assert.equal(f.calls.filter(([, method]) => method === 'POST').length, 1);
});
test('successful POST alone never declares ready or broadcasts activation', async () => {
  const f = fixture({ missing: true, postWithoutPersistence: true });
  assert.notEqual(await f.prompt.activatePushPrompt(f.profile, f.config), 'ready');
  assert.deepEqual(f.events, []);
});
test('pause is resumed only by explicit activation followed by revalidation', async () => {
  const f = fixture({ device: { authorizations: [{ active: false, revokedAt: null }] } });
  assert.equal(await f.prompt.inspectPushPrompt(f.profile), 'paused');
  assert.equal(await f.prompt.activatePushPrompt(f.profile, f.config), 'ready');
  assert.equal(f.calls.filter(([, method]) => method === 'POST').length, 1);
});
for (const [options, promptStatus, label] of [
  [{}, 'ready', 'Notificações ativadas'],
  [{ device: { authorizations: [{ active: false, revokedAt: null }] } }, 'paused', 'Notificações pausadas'],
  [{ permission: 'denied' }, 'hidden', 'Notificações bloqueadas'],
  [{ apiError: true }, 'error', 'Não foi possível verificar'],
  [{ missing: true }, 'hidden', 'Notificações ainda não ativadas'],
]) test(`popup and settings consume identical evaluation: ${promptStatus}`, { timeout: 5000 }, async () => {
  const f = fixture(options), slots = [], effects = [];
  let resolveEvaluation;
  const evaluationFinished = new Promise(resolve => { resolveEvaluation = resolve; });
  const React = require('react'); let cursor = 0;
  const hooks = { ...React,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => {
      slots[i] = value;
      if (value?.status && value.status !== 'loading') resolveEvaluation();
    }]; },
    useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; },
    useMemo: fn => { cursor++; return fn(); }, useCallback: fn => { cursor++; return fn; },
    useEffect: fn => { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(fn); } },
  };
  const { PushSettings } = load('components/push-settings.tsx', {
    react: hooks, './auth-provider': { useAuth: () => ({ profile: f.profile }) },
    '@/lib/push/client': f.client, '@/lib/push/prompt': f.prompt, '@/lib/push/events': { watchPushChanges() {} },
  }, { window: { addEventListener() {}, removeEventListener() {} }, document: { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' } });
  const render = () => { cursor = 0; return PushSettings(); };
  render(); const cleanups = effects.map(fn => fn());
  await evaluationFinished;
  assert.ok(JSON.stringify(render()).includes(label));
  assert.equal(await f.prompt.inspectPushPrompt(f.profile), promptStatus);
  cleanups.forEach(fn => fn?.());
});
test('cross-tab invalidation converges without rebroadcasting or exposing subscription', () => {
  const channels = [];
  class Channel {
    constructor(name) { this.name = name; this.sent = []; channels.push(this); }
    postMessage(data) { this.sent.push(data); for (const channel of channels) if (channel !== this && channel.name === this.name) channel.onmessage?.({ data }); }
  }
  const received = [[], []];
  const tabs = received.map(events => load('lib/push/events.ts', {}, { BroadcastChannel: Channel, window: { dispatchEvent: event => events.push(event.type) } }));
  tabs.forEach(tab => tab.watchPushChanges());
  tabs[0].notifyPushChanged({ user: { id: 'user-a' } });
  assert.deepEqual(received, [['kalend:push-changed'], ['kalend:push-changed']]);
  assert.equal(channels[0].sent.length, 1); assert.equal(channels[1].sent.length, 0);
  assert.doesNotMatch(JSON.stringify(channels[0].sent), /endpoint|keys|token/);
});
test('logout cleanup is awaited before new activation and unsubscribes captured old subscription', async () => {
  let release, replaced = false; const actions = [];
  const old = { unsubscribe: async () => { actions.push('old'); await new Promise(resolve => release = resolve); return true; } };
  const reg = { getNotifications: async () => [], pushManager: { getSubscription: async () => old } };
  const lifecycle = load('lib/push/lifecycle.ts', {}, { navigator: { serviceWorker: { getRegistration: async () => reg } } });
  const cleaning = lifecycle.clearLocalPush();
  const enabling = lifecycle.withPushLifecycle(async () => { replaced = true; actions.push('new'); });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(replaced, false); release(); await cleaning; await enabling;
  assert.deepEqual(actions, ['old', 'new']);
});
