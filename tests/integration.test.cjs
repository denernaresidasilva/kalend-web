/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => id in mocks ? mocks[id] : require(id), process: { env: {} }, console, setTimeout, clearTimeout, ...globals }, { filename: file });
  return loaded.exports;
}
const response = (status, value = {}) => new Response(status === 204 ? null : JSON.stringify(value), { status });
function client(handler, extras = {}) {
  const calls = []; const events = [];
  const api = load('lib/api.ts', {}, {
    fetch: async (url, init) => { calls.push({ path: new URL(url).pathname, ...init }); return handler(new URL(url).pathname, init); },
    navigator: { locks: { request: async (_name, fn) => fn() } },
    window: { dispatchEvent: event => events.push(event.type) }, Event,
    ...extras,
  });
  return { api, calls, events };
}
test('login, me, logout: cookies, JSON contract and 204', async () => {
  const me = { user: { name: 'Admin' }, systemRole: 'SUPER_ADMIN', memberships: [] };
  const { api, calls } = client(path => response(path === '/auth/logout' ? 204 : 200, path === '/auth/me' ? me : { authenticated: true }));
  await api.api('/auth/login', { method: 'POST', ...api.jsonBody({ email: 'admin@example.test', password: 'example-password' }) });
  assert.deepEqual(await api.api('/auth/me'), me);
  assert.equal(await api.api('/auth/logout', { method: 'POST' }), undefined);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.credentials === 'include' && call.cache === 'no-store'));
  assert.equal(calls[0].body, JSON.stringify({ email: 'admin@example.test', password: 'example-password' }));
});
test('invalid login never refreshes and never exposes internal messages', async () => {
  const { api, calls } = client(() => response(401, { message: 'INTERNAL_SECRET' }));
  await assert.rejects(api.api('/auth/login', { method: 'POST' }), error => error.status === 401 && !error.message.includes('INTERNAL_SECRET'));
  assert.equal(calls.length, 1);
});
test('concurrent 401 uses a single refresh and retries each request once', async () => {
  let refreshed = false;
  const { api, calls } = client(async path => {
    if (path === '/auth/refresh') { await new Promise(resolve => setTimeout(resolve, 5)); refreshed = true; return response(200); }
    return response(refreshed ? 200 : 401, { total: 1 });
  });
  await Promise.all([api.api('/companies'), api.api('/dashboard/summary'), api.api('/finance')]);
  assert.equal(calls.filter(call => call.path === '/auth/refresh').length, 1);
  for (const path of ['/companies', '/dashboard/summary', '/finance']) assert.equal(calls.filter(call => call.path === path).length, 2);
});
test('failed refresh ends session, with no retry loop', async () => {
  const { api, calls, events } = client(() => response(401));
  await assert.rejects(api.api('/auth/me'));
  await assert.rejects(api.api('/companies'));
  assert.equal(calls.filter(call => call.path === '/auth/refresh').length, 1);
  assert.ok(events.includes('kalend:session-ended'));
});
test('401 after successful refresh ends session without a second refresh', async () => {
  const { api, calls, events } = client(path => response(path === '/auth/refresh' ? 200 : 401));
  await assert.rejects(api.api('/companies'));
  assert.equal(calls.filter(call => call.path === '/auth/refresh').length, 1);
  assert.ok(events.includes('kalend:session-ended'));
});
test('another tab rotated: access probe prevents redundant refresh', async () => {
  let requests = 0;
  const { api, calls } = client(path => response(path === '/auth/me' || requests++ > 0 ? 200 : 401));
  await api.api('/companies');
  assert.equal(calls.filter(call => call.path === '/auth/refresh').length, 0);
});
test('403/400/409/422/429/500/503 sanitized and never refreshed', async () => {
  for (const status of [400, 403, 409, 422, 429, 500, 503]) {
    const { api, calls } = client(() => response(status, { message: 'PRIVATE DATABASE DETAILS' }));
    await assert.rejects(api.api('/companies'), error => error.status === status && !error.message.includes('PRIVATE'));
    assert.equal(calls.length, 1);
  }
});
test('no cross-tab lock support fails closed', async () => {
  const { api, calls } = client(() => response(401), { navigator: {} });
  await assert.rejects(api.api('/companies'));
  assert.equal(calls.length, 1);
});
test('all admin children remain unmounted while loading, unauthenticated, or ordinary user', () => {
  for (const state of [ { loading: true, profile: null }, { loading: false, profile: null }, { loading: false, profile: { systemRole: 'USER', user: { name: 'User' } } }, { loading: false, profile: { systemRole: 'SUPER_ADMIN', user: { name: 'Admin' } } } ]) {
    const redirects = []; const effects = [];
    const Layout = load('app/super-admin/layout.tsx', {
      react: { ...React, useEffect: fn => effects.push(fn) },
      'next/link': ({ children }) => React.createElement('a', null, children),
      'next/navigation': { useRouter: () => ({ replace: path => redirects.push(path) }) },
      '@/components/auth-provider': { useAuth: () => ({ ...state, error: '', reload() {}, logout() {} }) },
      '@/lib/contracts': { isSuperAdmin: profile => profile?.systemRole === 'SUPER_ADMIN' },
    }).default;
    let mounted = false;
    function Protected() { mounted = true; return React.createElement('p', null, 'PRIVATE CONTENT'); }
    const html = renderToStaticMarkup(React.createElement(Layout, null, React.createElement(Protected)));
    assert.equal(mounted, state.profile?.systemRole === 'SUPER_ADMIN');
    if (state.profile?.systemRole === 'USER') assert.match(html, /Acesso não autorizado/);
    effects.forEach(fn => fn());
    if (!state.loading && !state.profile) assert.deepEqual(redirects, ['/']);
  }
});
test('dashboard requests real summary and does not calculate revenue', async () => {
  const effects = []; const calls = [];
  const Component = load('components/dashboard-summary.tsx', {
    react: { ...React, useEffect: fn => effects.push(fn) },
    'next/link': ({ children }) => React.createElement('a', null, children),
    '@/lib/api': { api: async path => { calls.push(path); return {}; } },
  }, { window: { addEventListener() {}, removeEventListener() {} } }).default;
  renderToStaticMarkup(React.createElement(Component));
  effects.forEach(fn => fn());
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(calls, ['/dashboard/summary']);
});
test('security audit: no token storage and gateway secrets are write-only', () => {
  const files = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (entry.isDirectory()) walk(`${dir}/${entry.name}`); else files.push(`${dir}/${entry.name}`); } }
  ['app', 'components', 'lib'].forEach(walk);
  const source = files.filter(file => /\.(tsx?|jsx?)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /localStorage|sessionStorage|Bearer|document\.cookie/);
  const gateways = fs.readFileSync('app/super-admin/configuracoes/pagamentos/page.tsx', 'utf8');
  assert.doesNotMatch(gateways, /gateway\.(credentials|webhookSecret)\b/);
  assert.match(gateways, /credentials \? \{ credentials \} : \{\}/);
  assert.match(gateways, /setCredentials\(""\); setWebhookSecret\(""\)/);
});
test('login form loads me, navigates, clears password and handles invalid credentials', async () => {
  for (const invalid of [false, true]) {
    const calls = []; const messages = []; let cleared = false; let reset = false;
    const { api } = client(() => response(200));
    const Login = load('app/page.tsx', {
      react: { ...React, useState: initial => [initial, value => messages.push(value)] },
      'next/navigation': { useRouter: () => ({ replace: path => calls.push(path) }) },
      '@/components/auth-provider': { useAuth: () => ({ reload: async () => { calls.push('me'); return { systemRole: 'SUPER_ADMIN' }; } }) },
      '@/lib/api': { ...api, api: async path => { calls.push(path); if (invalid) throw new api.ApiError(401); } },
    }, { FormData: class { get(key) { return key === 'email' ? 'admin@example.test' : 'test-password'; } } }).default;
    const tree = Login();
    function findForm(node) { if (!node || typeof node !== 'object') return; if (node.type === 'form') return node; for (const child of React.Children.toArray(node.props?.children)) { const found = findForm(child); if (found) return found; } }
    const password = { set value(value) { cleared = value === ''; } };
    await findForm(tree).props.onSubmit({ preventDefault() {}, currentTarget: { reset() { reset = true; }, elements: { namedItem: () => password } } });
    assert.equal(cleared, true);
    if (invalid) { assert.deepEqual(calls, ['/auth/login']); assert.ok(messages.includes('E-mail ou senha inválidos.')); }
    else { assert.deepEqual(calls, ['/auth/login', 'me', '/super-admin']); assert.equal(reset, true); }
  }
});
test('two independent tabs serialize rotation through the shared lock', async () => {
  let tail = Promise.resolve(); let rotations = 0; let valid = false;
  const navigator = { locks: { request(_name, fn) { const next = tail.then(fn); tail = next.catch(() => {}); return next; } } };
  const handler = async path => {
    if (path === '/auth/refresh') { rotations++; await new Promise(resolve => setTimeout(resolve, 5)); valid = true; return response(200); }
    return response(valid ? 200 : 401);
  };
  const first = client(handler, { navigator }); const second = client(handler, { navigator });
  await Promise.all([first.api.api('/companies'), second.api.api('/companies')]);
  assert.equal(rotations, 1);
});
