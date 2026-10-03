/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: id => mocks[id] || require(id), Date, Event, ...globals });
  return mod.exports;
}
const profile = { user: { id: 'a' }, selectedCompanyId: 'company-a', systemRole: 'USER' };
function fixture(options = {}) {
  const calls = [];
  const notification = { permission: options.permission || 'default', requestPermission: async () => { calls.push('permission'); return notification.permission = options.choice || 'granted'; } };
  const sub = options.absent ? null : { expirationTime: options.expirationTime ?? null };
  const device = { id: 'device-a', active: true, registeredInCurrentSession: true, ...options.device };
  const config = { available: options.available !== false };
  const client = {
    supported: () => options.supported !== false, eligible: p => !!p.selectedCompanyId || p.systemRole === 'SUPER_ADMIN',
    inContext: async (p, work) => { calls.push(['context', p.user.id, p.selectedCompanyId]); return work(); },
    registration: async () => ({ pushManager: { getSubscription: async () => sub } }),
    subscriptionMatchesVapid: () => options.matchingKey !== false,
    currentId: async () => options.unmapped ? null : 'device-a',
    activeDevice: d => d.active && !d.revokedAt && (!d.authorizations || d.authorizations.some(a => a.active && !a.revokedAt)),
    pushApi: { config: async () => { calls.push('config'); return config; }, list: async () => options.noBackend ? [] : [device] },
    enable: async p => { calls.push(['enable', p.user.id, p.selectedCompanyId]); if (options.fail) throw Error('fixture'); },
  };
  const globals = { Notification: notification, navigator: {}, document: { visibilityState: 'visible', hasFocus: () => true }, window: { dispatchEvent: () => calls.push('changed') } };
  return { ...load('lib/push/prompt.ts', { './client': client }, globals), calls, globals };
}
test('default invites without requesting permission or registering', async () => { const f = fixture(); assert.equal(await f.inspectPushPrompt(profile), 'invite'); assert.deepEqual(f.calls.filter(c => c === 'permission' || c[0] === 'enable'), []); });
test('granted and valid registered session hides invitation', async () => { const f = fixture({ permission: 'granted' }); assert.equal(await f.inspectPushPrompt(profile), 'ready'); assert.equal(f.calls.some(c => c[0] === 'enable'), false); });
for (const options of [{ absent: true }, { noBackend: true }, { device: { revokedAt: 'fixture', active: false } }, { device: { registeredInCurrentSession: false } }]) test(`granted repairs missing/revoked/session registration ${JSON.stringify(options)}`, async () => {
  const f = fixture({ permission: 'granted', ...options }); assert.equal(await f.inspectPushPrompt(profile), 'ready'); assert.deepEqual(f.calls.find(c => c[0] === 'enable'), ['enable', 'a', 'company-a']); assert.equal(f.calls.includes('permission'), false);
});
test('denied neither invites nor requests permission nor queries backend', async () => { const f = fixture({ permission: 'denied' }); assert.equal(await f.inspectPushPrompt(profile), 'hidden'); assert.equal(await f.activatePushPrompt(profile), 'hidden'); assert.deepEqual(f.calls, []); });
test('explicit activation requests permission before API and registers existing identity', async () => { const f = fixture(); assert.equal(await f.activatePushPrompt(profile), 'ready'); assert.equal(f.calls[0], 'permission'); assert.equal(f.calls.at(-1), 'changed'); });
test('declined permission does not register', async () => { const f = fixture({ choice: 'denied' }); assert.equal(await f.activatePushPrompt(profile), 'hidden'); assert.deepEqual(f.calls, ['permission']); });
test('failed granted repair rejects once without recursive retries', async () => { const f = fixture({ permission: 'granted', absent: true, fail: true }); await assert.rejects(f.inspectPushPrompt(profile)); assert.equal(f.calls.filter(c => c[0] === 'enable').length, 1); });
test('changed VAPID is not treated as a valid registered subscription', async () => { const f = fixture({ permission: 'granted', matchingKey: false, fail: true }); await assert.rejects(f.inspectPushPrompt(profile)); assert.equal(f.calls.filter(c => c[0] === 'enable').length, 1); });
test('expired subscription with active tenant consent is repaired, not treated as a pause', async () => { const f = fixture({ permission: 'granted', expirationTime: 1, device: { authorizations: [{ active: true, revokedAt: null }] } }); assert.equal(await f.inspectPushPrompt(profile), 'ready'); assert.equal(f.calls.filter(c => c[0] === 'enable').length, 1); });
test('explicit tenant pause is preserved', async () => { const f = fixture({ permission: 'granted', device: { authorizations: [{ active: false, revokedAt: null }] } }); assert.equal(await f.inspectPushPrompt(profile), 'paused'); assert.equal(f.calls.some(c => c[0] === 'enable'), false); });
test('roles use same mechanism; ordinary user must select company', async () => { for (const role of ['OWNER','PROFESSIONAL','RECEPTIONIST','CLIENT']) assert.equal(await fixture().inspectPushPrompt({ ...profile, membershipRole: role }), 'invite'); assert.equal(await fixture().inspectPushPrompt({ ...profile, selectedCompanyId: null }), 'context'); assert.equal(await fixture().inspectPushPrompt({ ...profile, selectedCompanyId: null, systemRole: 'SUPER_ADMIN' }), 'invite'); });
test('unsupported browser never requests permission', async () => { const f = fixture({ supported: false }); assert.equal(await f.inspectPushPrompt(profile), 'hidden'); assert.deepEqual(f.calls, []); });
test('origin lock prevents a second tab invitation and releases for next entry', async () => {
  const f = fixture(); let held = false, release, shown = 0;
  f.globals.navigator.locks = { request: async (name, options, work) => { assert.equal(name, 'kalend:web-push-prompt'); assert.equal(options.ifAvailable, true); if (held) return work(null); held = true; try { await work({}); } finally { held = false; } } };
  const first = f.withPushPromptLock(async () => { shown++; await new Promise(r => release = r); });
  await f.withPushPromptLock(async () => shown++); assert.equal(shown, 1);
  release(); await first; await f.withPushPromptLock(async () => shown++); assert.equal(shown, 2);
});
test('fallback skips background/unfocused documents', async () => { const f = fixture(); f.globals.document.hasFocus = () => false; let shown = 0; await f.withPushPromptLock(async () => shown++); assert.equal(shown, 0); });
test('dismissal closes the global popup, next route and fresh mount offer again', async () => {
  const React = require('react');
  async function mount() {
    const slots = [], pending = []; let index = 0, pathname = '/super-admin', tree;
    const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
    const hooks = { ...React,
      useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = typeof value === 'function' ? value(slots[i]) : value]; },
      useRef: initial => { const i = index++; return slots[i] ||= { current: initial }; },
      useMemo: (fn, deps) => { const i = index++; if (!equal(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
      useEffect: (fn, deps) => { const i = index++; if (!equal(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => slots[i].cleanup = fn()); } },
    };
    const browser = { addEventListener() {}, removeEventListener() {} };
    const { PushNotificationPrompt } = load('components/push-notification-prompt.tsx', {
      react: hooks, 'next/navigation': { usePathname: () => pathname }, 'next/link': () => null,
      './auth-provider': { useAuth: () => ({ profile, loading: false }) }, './ui/button': { Button: () => null },
      '@/lib/push/prompt': { inspectPushPrompt: async () => 'invite', withPushPromptLock: async fn => fn(), activatePushPrompt: async () => 'ready' },
    }, { Notification: { permission: 'default' }, document: { ...browser, visibilityState: 'visible', hasFocus: () => true }, window: browser, setTimeout, clearTimeout });
    const render = () => { index = 0; tree = PushNotificationPrompt(); while (pending.length) pending.shift()(); return tree; };
    const settle = async () => { render(); await new Promise(r => setTimeout(r, 5)); return render(); };
    return { settle, navigate: path => pathname = path, cleanup: () => { for (const slot of slots) slot?.cleanup?.(); } };
  }
  const first = await mount();
  try {
    let tree = await first.settle(); assert.equal(tree.props.role, 'dialog');
    const children = React.Children.toArray(tree.props.children);
    const actions = React.Children.toArray(children.at(-1).props.children);
    actions.find(n => n.props.children === 'Agora não').props.onClick();
    assert.equal(await first.settle(), null);
    first.navigate('/conta'); tree = await first.settle(); assert.equal(tree.props.role, 'dialog');
    first.navigate('/super-admin'); tree = await first.settle(); assert.equal(tree.props.role, 'dialog');
    const nextActions = React.Children.toArray(React.Children.toArray(tree.props.children).at(-1).props.children);
    nextActions.find(n => n.props.children === 'Ativar notificações').props.onClick();
    await new Promise(r => setTimeout(r, 5)); assert.equal(await first.settle(), null);
  } finally { first.cleanup(); }
  const reload = await mount(); try { assert.equal((await reload.settle()).props.role, 'dialog'); } finally { reload.cleanup(); }
});
