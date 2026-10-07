/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + (file === 'components/push-notification-prompt.tsx' ? '\nexport { PushActivationModal };' : ''), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: id => mocks[id] || require(id), Date, Event, ...globals });
  return mod.exports;
}
const profile = { user: { id: 'a' }, selectedCompanyId: 'company-a', systemRole: 'USER' };
function fixture(options = {}) {
  const calls = [];
  const notification = { permission: options.permission || 'default', requestPermission: async () => { calls.push('permission'); return notification.permission = options.choice || 'granted'; } };
  const sub = options.absent ? null : { expirationTime: options.expirationTime ?? null };
  const device = { id: 'device-a', active: true, ...options.device };
  const config = { available: options.available !== false, publicKey: "public-fixture" };
  const client = {
    evaluatePush: async p => {
      if (!p.selectedCompanyId && p.systemRole !== "SUPER_ADMIN") return { status: "context" };
      if (options.supported === false || options.available === false) return { status: 'unavailable' };
      if (notification.permission === 'denied') return { status: 'blocked' };
      if (notification.permission === 'default' || options.absent || options.noBackend || options.expirationTime === 1) return { status: 'needs_registration' };
      if (device.revokedAt || !device.active || device.authorizations?.some(a => !a.active || a.revokedAt)) return { status: 'paused' };
      if (options.fail || options.matchingKey === false) return { status: 'error' };
      return { status: 'activated' };
    },
    supported: () => options.supported !== false, eligible: p => !!p.selectedCompanyId || p.systemRole === 'SUPER_ADMIN',
    inContext: async (p, work) => { calls.push(['context', p.user.id, p.selectedCompanyId]); return work(); },
    registration: async () => ({ pushManager: { getSubscription: async () => sub } }),
    subscriptionMatchesVapid: () => options.matchingKey !== false,
    currentId: async () => options.unmapped ? null : 'device-a',
    activeDevice: d => d.active && !d.revokedAt && (!d.authorizations || d.authorizations.some(a => a.active && !a.revokedAt)),
    pushApi: { config: async () => { calls.push('config'); return config; }, list: async () => options.noBackend ? [] : [device] },
    enable: async p => { calls.push(['enable', p.user.id, p.selectedCompanyId]); if (options.fail) throw Error('fixture'); if (notification.permission === 'default') await notification.requestPermission(); return notification.permission === 'granted' ? device : null; },
  };
  const globals = { Notification: notification, navigator: {}, document: { visibilityState: 'visible', hasFocus: () => true }, window: { dispatchEvent: () => calls.push('changed') } };
  return { ...load('lib/push/prompt.ts', { './client': client, './events': { notifyPushChanged: () => calls.push('changed') } }, globals), calls, globals };
}
test('default invites without requesting permission or registering', async () => { const f = fixture(); assert.equal(await f.inspectPushPrompt(profile), 'invite'); assert.deepEqual(f.calls.filter(c => c === 'permission' || c[0] === 'enable'), []); });
test('granted and valid authorized device hides invitation', async () => { const f = fixture({ permission: 'granted' }); assert.equal(await f.inspectPushPrompt(profile), 'ready'); assert.equal(f.calls.some(c => c[0] === 'enable'), false); });
for (const options of [{ absent: true }, { noBackend: true }]) test(`read-only inspection requires registration ${JSON.stringify(options)}`, async () => {
  const f = fixture({ permission: 'granted', ...options }); assert.equal(await f.inspectPushPrompt(profile), 'hidden'); assert.equal(f.calls.some(c => c[0] === 'enable'), false);
});
test('denied neither invites nor requests permission nor queries backend', async () => { const f = fixture({ permission: 'denied' }); assert.equal(await f.inspectPushPrompt(profile), 'hidden'); assert.equal(await f.activatePushPrompt(profile), 'hidden'); assert.deepEqual(f.calls, []); });
test('explicit activation validates configuration before permission and registers existing identity', async () => { const f = fixture(); assert.equal(await f.activatePushPrompt(profile), 'ready'); assert.ok(f.calls.indexOf('config') < f.calls.indexOf('permission')); assert.equal(f.calls.at(-1), 'changed'); });
test('declined permission does not register', async () => { const f = fixture({ choice: 'denied' }); assert.equal(await f.activatePushPrompt(profile), 'hidden'); assert.equal(f.calls.includes('changed'), false); });
test('failed inspection reports error without registration', async () => {
  const f = fixture({ permission: 'granted', fail: true }); assert.equal(await f.inspectPushPrompt(profile), 'error'); assert.equal(f.calls.some(c => c[0] === 'enable'), false);
});
test('changed VAPID blocks activation', async () => {
  const f = fixture({ permission: 'granted', matchingKey: false }); assert.equal(await f.activatePushPrompt(profile), 'error'); assert.equal(f.calls.some(c => c[0] === 'enable'), false);
});
test('expired subscription requires explicit registration', async () => {
  const f = fixture({ permission: 'granted', expirationTime: 1 }); assert.equal(await f.inspectPushPrompt(profile), 'hidden'); assert.equal(f.calls.some(c => c[0] === 'enable'), false);
});
test('explicit tenant pause is preserved', async () => { const f = fixture({ permission: 'granted', device: { authorizations: [{ active: false, revokedAt: null }] } }); assert.equal(await f.inspectPushPrompt(profile), 'paused'); assert.equal(f.calls.some(c => c[0] === 'enable'), false); });
test('roles use same mechanism; ordinary user must select company', async () => { for (const role of ['OWNER','PROFESSIONAL','RECEPTIONIST','CLIENT']) assert.equal(await fixture().inspectPushPrompt({ ...profile, membershipRole: role }), 'invite'); assert.equal(await fixture().inspectPushPrompt({ ...profile, selectedCompanyId: null }), 'context'); assert.equal(await fixture().inspectPushPrompt({ ...profile, selectedCompanyId: null, systemRole: 'SUPER_ADMIN' }), 'invite'); });
test('unsupported browser never requests permission', async () => { const f = fixture({ supported: false }); assert.equal(await f.inspectPushPrompt(profile), 'error'); assert.deepEqual(f.calls, []); });
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
  async function mount(options = {}) {
    const slots = [], pending = []; let index = 0, pathname = options.pathname || '/super-admin', tree;
    const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
    const hooks = { ...React,
      useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = typeof value === 'function' ? value(slots[i]) : value]; },
      useRef: initial => { const i = index++; return slots[i] ||= { current: initial }; },
      useMemo: (fn, deps) => { const i = index++; if (!equal(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
      useEffect: (fn, deps) => { const i = index++; if (!equal(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => slots[i].cleanup = fn()); } },
    };
    const events = {};
    const notification = { permission: options.permission || 'default' };
    const browser = { addEventListener: (name, fn) => events[name] = fn, removeEventListener: name => delete events[name], dispatchEvent: event => events[event.type]?.() };
    const { PushNotificationPrompt } = load('components/push-notification-prompt.tsx', {
      react: hooks, 'next/navigation': { usePathname: () => pathname }, 'next/link': () => null,
      './auth-provider': { useAuth: () => ({ profile: options.visitor ? null : profile, loading: !!options.loading }) }, './ui/button': { Button: () => null },
      '@/lib/push/client': {},
      '@/lib/push/events': { watchPushChanges() {} },
      '@/lib/push/routes': { pushPromptAllowed: (p, path) => !!p && path !== '/' && path !== '/planos' },
      '@/lib/push/prompt': { inspectPushPrompt: async () => options.status || 'invite', withPushPromptLock: async fn => fn(), activatePushPrompt: async () => { if (options.fail) throw Error('API'); notification.permission = options.choice || 'granted'; browser.dispatchEvent(new Event('kalend:push-changed')); return notification.permission === 'denied' ? 'hidden' : 'ready'; } },
    }, { console: { warn() {} }, Notification: notification, document: { ...browser, visibilityState: 'visible', hasFocus: () => true }, window: browser, setTimeout, clearTimeout });
    const render = () => { index = 0; tree = PushNotificationPrompt(); while (pending.length) pending.shift()(); return tree; };
    const settle = async () => { render(); await new Promise(r => setTimeout(r, 5)); return render(); };
    return { settle, emit: name => events[name]?.(), navigate: path => pathname = path, cleanup: () => { for (const slot of slots) slot?.cleanup?.(); } };
  }
  for (const options of [{visitor:true},{loading:true},{pathname:'/'},{pathname:'/planos'}]) {
    const instance = await mount(options);
    try { assert.equal(await instance.settle(), null); instance.emit('kalend:push-open'); assert.equal(await instance.settle(), null); }
    finally { instance.cleanup(); }
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
    tree = await first.settle(); assert.equal(typeof tree.props.onActivate === "function", true);
    await tree.props.onActivate({ available: true, publicKey: 'fixture' });
    tree = await first.settle(); assert.equal(tree, null);
  } finally { first.cleanup(); }
  const active = await mount({ status: 'ready', permission: 'granted' });
  try { assert.equal(await active.settle(), null); } finally { active.cleanup(); }
  for (const options of [{ choice: 'denied' }, { fail: true }]) {
    const instance = await mount(options);
    try {
      let tree = await instance.settle();
      const actions = React.Children.toArray(React.Children.toArray(tree.props.children).at(-1).props.children);
      actions.find(n => n.props.children === 'Ativar notificações').props.onClick();
      tree = await instance.settle();
      await tree.props.onActivate({ available: true, publicKey: 'fixture' });
      tree = await instance.settle(); assert.equal(tree.props.result, options.fail ? 'error' : 'denied');
      tree.props.onClose(); assert.equal(await instance.settle(), null);
    } finally { instance.cleanup(); }
  }
  const ended = await mount();
  try {
    await ended.settle(); ended.emit('kalend:push-open');
    assert.ok((await ended.settle()).props.onActivate);
    ended.emit('kalend:session-ended');
    const tree = await ended.settle(); assert.equal(tree?.props.onActivate, undefined);
  } finally { ended.cleanup(); }
  const reload = await mount(); try { assert.equal((await reload.settle()).props.role, 'dialog'); } finally { reload.cleanup(); }
});

test('unavailable configuration never requests permission or registers', async () => {
  const f = fixture({ available: false });
  assert.equal(await f.activatePushPrompt(profile), 'error');
  assert.equal(f.calls.includes('permission'), false);
  assert.equal(f.calls.some(call => call[0] === 'enable'), false);
});
test('prepared modal configuration requests permission without another config round trip', async () => {
  const f = fixture();
  assert.equal(await f.activatePushPrompt(profile, { available: true, publicKey: 'fixture' }), 'ready');
  assert.equal(f.calls.includes('config'), false);
  assert.equal(f.calls.includes('permission'), true);
});


test('modal hides preparation failure until a real click and preserves retry', async () => {
  const React = require('react');
  const slots = [], effects = []; let cursor = 0; let activated = 0;
  const hooks = { ...React,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = value]; },
    useRef: () => ({ current: { showModal() {}, close() {} } }),
    useEffect: fn => effects.push(fn),
  };
  const { PushActivationModal } = load('components/push-notification-prompt.tsx', {
    react: hooks, 'next/navigation': {}, './auth-provider': {}, './ui/button': { Button: () => null },
    '@/lib/push/events': { watchPushChanges() {} },
      '@/lib/push/routes': {}, '@/lib/push/prompt': {},
    '@/lib/push/client': { supported: () => true, registration: async () => {}, inContext: async (_, fn) => fn(), pushApi: { config: async () => { throw Error('unavailable'); } } },
  }, { Notification: { permission: 'default' } });
  const props = { profile, busy: false, result: '', onClose() {}, onActivate: () => activated++ };
  const render = () => { cursor = 0; return PushActivationModal(props); };
  render(); for (const effect of effects.splice(0)) effect(); await new Promise(r => setTimeout(r, 0));
  const tree = render();
  const children = React.Children.toArray(tree.props.children);
  assert.match(children[1].props.children, /Você receberá avisos/);
  assert.doesNotMatch(children[1].props.children, /Não foi possível/);
  const button = React.Children.toArray(children[2].props.children)[0].props.children[0];
  assert.equal(button.props.disabled, false); button.props.onClick(); assert.equal(activated, 1);
  props.result = 'error'; assert.match(React.Children.toArray(render().props.children)[1].props.children, /Não foi possível/);
});
