/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
function fixture(options = {}) {
  const slots = [], effects = [], calls = [], listeners = {};
  let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
  const hooks = { ...React,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = typeof value === 'function' ? value(slots[i]) : value]; },
    useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; },
    useMemo: (fn, deps) => { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback: (fn, deps) => hooks.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => slots[i].cleanup = fn()); } },
  };
  let fail = options.fail;
  const profile = { user: { id: 'a' }, selectedCompanyId: 'company-a', systemRole: 'USER' };
  const client = {
    activeDevice: row => row.active, currentId: async () => 'device', eligible: () => true,
    supported: () => true, permissionState: () => 'permission-granted', subscriptionMatchesVapid: () => true,
    registration: async () => ({ pushManager: { getSubscription: async () => ({ expirationTime: null }) } }),
    inContext: async (_, work) => work(),
    pushApi: {
      config: async () => ({ available: !options.unavailable, publicKey: 'fixture' }),
      list: async () => [{ id: 'device', active: true, registeredInCurrentSession: options.bound !== false }],
      test: async id => { calls.push(id); if (fail) throw Error('Internal technical failure'); return { queued: true }; },
    },
  };
  const mod = { exports: {} };
  const window = { addEventListener: (name, fn) => listeners[name] = fn, removeEventListener: name => delete listeners[name], dispatchEvent: event => calls.push(event.type) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/push-settings.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: id => ({ react: hooks, './auth-provider': { useAuth: () => ({ profile }) }, '@/lib/push/client': client }[id] || require(id)), window, Notification: { permission: 'granted' }, crypto: { randomUUID: () => 'request-id' }, setTimeout, clearTimeout, Date, Event });
  const render = () => { cursor = 0; const tree = mod.exports.PushSettings(); while (effects.length) effects.shift()(); return tree; };
  return { render, calls, retry: () => fail = false, settle: async () => { render(); await new Promise(r => setTimeout(r, 10)); return render(); }, cleanup: () => slots.forEach(slot => slot?.cleanup?.()) };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)]; }
function content(tree) { return nodes(tree).flatMap(node => React.Children.toArray(node.props?.children).filter(child => typeof child === 'string')).join(' '); }
test('active settings shows simple status and test loading/success', async () => {
  const f = fixture();
  try {
    let tree = await f.settle(); assert.match(content(tree), /🟢 Notificações ativadas/);
    assert.doesNotMatch(content(tree), /VAPID|endpoint|subscription|servidor|Dispositivo atual|sessão|worker/);
    const send = nodes(tree).find(node => node.type === 'button');
    const pending = send.props.onClick(); tree = f.render(); assert.match(content(tree), /Enviando/);
    await pending; await new Promise(r => setTimeout(r, 0)); tree = f.render(); assert.match(content(tree), /✓ Notificação enviada\./);
  } finally { f.cleanup(); }
});
test('failed test is friendly and retries the same idempotency ID', async () => {
  const f = fixture({ fail: true });
  try {
    let tree = await f.settle(); await nodes(tree).find(node => node.type === 'button').props.onClick();
    await new Promise(r => setTimeout(r, 0)); tree = f.render(); assert.match(content(tree), /Não foi possível enviar/); assert.doesNotMatch(content(tree), /Internal technical failure/);
    f.retry(); await nodes(tree).find(node => node.type === 'button').props.onClick(); await new Promise(r => setTimeout(r, 0));
    assert.deepEqual(f.calls, ['request-id', 'request-id']);
  } finally { f.cleanup(); }
});
for (const options of [{ unavailable: true }, { bound: false }]) test(`unavailable or unbound settings never claims active ${JSON.stringify(options)}`, async () => {
  const f = fixture(options);
  try {
    const tree = await f.settle(); assert.match(content(tree), /🔴 Notificações desativadas/);
    const activate = nodes(tree).find(node => node.type === 'button'); assert.equal(activate.props.children, 'Ativar notificações'); activate.props.onClick(); assert.deepEqual(f.calls, ['kalend:push-open']);
  } finally { f.cleanup(); }
});
