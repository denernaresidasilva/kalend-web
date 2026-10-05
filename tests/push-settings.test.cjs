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
  const profile = { user: { id: 'a' }, selectedCompanyId: 'company-a', systemRole: 'USER' };
  const client = {
    evaluatePush: async () => ({ status: options.status || 'activated' }),
  };
  const mod = { exports: {} };
  const window = { addEventListener: (name, fn) => listeners[name] = fn, removeEventListener: name => delete listeners[name], dispatchEvent: event => calls.push(event.type) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/push-settings.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: id => ({ react: hooks, './auth-provider': { useAuth: () => ({ profile }) }, '@/lib/push/client': client, '@/lib/push/events': { watchPushChanges() {} } }[id] || require(id)), window, document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }, Notification: { permission: 'granted' }, crypto: { randomUUID: () => 'request-id' }, setTimeout, clearTimeout, Date, Event });
  const render = () => { cursor = 0; const tree = mod.exports.PushSettings(); while (effects.length) effects.shift()(); return tree; };
  return { render, calls, settle: async () => { render(); await new Promise(r => setTimeout(r, 10)); return render(); }, cleanup: () => slots.forEach(slot => slot?.cleanup?.()) };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...React.Children.toArray(tree.props?.children).flatMap(nodes)]; }
function content(tree) { return nodes(tree).flatMap(node => React.Children.toArray(node.props?.children).filter(child => typeof child === 'string')).join(' '); }
test('active settings does not call a missing self-test route', async () => {
  const f = fixture();
  try {
    const tree = await f.settle(); assert.match(content(tree), /Notificações ativadas/);
    assert.equal(nodes(tree).filter(node => node.type === 'button').length, 0);
  } finally { f.cleanup(); }
});
for (const [status, label] of Object.entries({ loading: 'Verificando notificações', paused: 'Notificações pausadas', blocked: 'Notificações bloqueadas no navegador', unavailable: 'Notificações indisponíveis', context: 'Selecione uma empresa', error: 'Não foi possível verificar', needs_registration: 'Notificações ainda não ativadas' })) {
  test(`settings displays ${status} without claiming disabled`, async () => {
    const f = fixture({ status });
    try {
      const tree = await f.settle(); assert.ok(content(tree).includes(label));
      assert.doesNotMatch(content(tree), /Notificações desativadas/);
      if (status === 'paused' || status === 'needs_registration') {
        nodes(tree).find(node => node.type === 'button').props.onClick();
        assert.deepEqual(f.calls, ['kalend:push-open']);
      }
    } finally { f.cleanup(); }
  });
}
