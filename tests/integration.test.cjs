/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const pathModule = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => id in mocks ? mocks[id] : id.startsWith('@/') || id.startsWith('./') ? loadModule(id.startsWith('@/') ? id.slice(2) : pathModule.join(pathModule.dirname(file), id), mocks, globals) : require(id), process: { env: { NEXT_PUBLIC_API_URL: 'https://api-dev.kalend.tech' } }, console, setTimeout, clearTimeout, URL, Error, ...globals }, { filename: file });
  return loaded.exports;
}
function loadModule(base, mocks, globals) { const file = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file)); return load(file, mocks, globals); }
const response = (status, value = {}) => new Response(status === 204 ? null : JSON.stringify(value), { status });
function client(handler, extras = {}) {
  const calls = []; const events = [];
  const api = load('lib/api.ts', {}, {
    fetch: async (url, init) => { calls.push({ path: new URL(url).pathname, ...init }); return handler(new URL(url).pathname, init); },
    navigator: { locks: { request: async (_name, fn) => fn() } },
    window: { dispatchEvent: event => events.push(event.type) }, Event, CustomEvent: class extends Event { constructor(type, init) { super(type); this.detail = init.detail; } },
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
  const gateways = fs.readFileSync('components/gateway-form.tsx', 'utf8');
  assert.doesNotMatch(gateways, /gateway\.(credentials|webhookSecret)\b/);
  assert.match(fs.readFileSync('lib/commercial.ts', 'utf8'), /values\.credentials \? \{ credentials: values\.credentials \} : \{\}/);
  assert.match(gateways, /setCredentials\(""\); setWebhookSecret\(""\)/);
});
test('login form loads me, navigates, clears password and handles invalid credentials', async () => {
  for (const invalid of [false, true]) {
    const calls = []; const messages = []; let cleared = false; let reset = false;
    const { api } = client(() => response(200));
    const Login = load('app/page.tsx', {
      react: { ...React, useState: initial => [initial, value => messages.push(value)] },
      'next/navigation': { useRouter: () => ({ replace: path => calls.push(path) }) },
      '@/components/auth-provider': { useAuth: () => ({ reload: async () => { calls.push('me'); return { systemRole: 'SUPER_ADMIN', user: { id: 'admin-fixture' }, memberships: [], selectedCompanyId: null }; } }) },
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

const commercial = load('lib/commercial.ts');
const linkMock = ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children);
const gatewayFixture = (gateway = 'STRIPE', extra = {}) => ({
  gateway, provider: gateway, enabled: false, environment: 'SANDBOX', publicId: null,
  configured: true, webhookConfigured: true, status: 'CONNECTED', lastValidatedAt: null,
  adapterAvailable: true, webhookPath: `/webhooks/${gateway.toLowerCase().replaceAll('_', '-')}`,
  webhookUrl: null, webhookStatus: gateway === 'PAGBANK' ? 'REMOTE_KEY_UNVERIFIED' : 'CONFIGURED_UNVERIFIED',
  recurringConfigured: false,
  capabilities: { checkout: true, recurring: false, nativeIdempotency: true, cancelAtPeriodEnd: true, webhookManagement: false },
  ...extra,
});
function nodes(tree, predicate) {
  const result = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) result.push(node);
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(tree); return result;
}
const textOf = tree => renderToStaticMarkup(tree);
function harness(file, name, mocks = {}, globals = {}) {
  const state = []; const refs = []; let cursor = 0; let refCursor = 0;
  const hooks = { ...React,
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useRef(initial) { const index = refCursor++; refs[index] ??= { current: initial }; return refs[index]; },
    useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
  };
  const Component = load(file, { react: hooks, 'next/link': linkMock, ...mocks }, { window: { confirm: () => true, addEventListener() {}, removeEventListener() {} }, crypto: { randomUUID: () => 'operation-id' }, ...globals })[name];
  return { render(props) { cursor = 0; refCursor = 0; return Component(props); }, state };
}
const button = (tree, label) => nodes(tree, n => n.type === 'button' && textOf(n).includes(label))[0];
const input = (tree, type) => nodes(tree, n => n.type === 'input' && n.props.type === type);

test('four gateway cards link to individual configuration, without invented statuses', () => {
  const { GatewayCards } = load('components/gateway-cards.tsx', { 'next/link': linkMock });
  const html = textOf(React.createElement(GatewayCards, { gateways: Object.keys(commercial.gatewayNames).map(g => gatewayFixture(g)) }));
  for (const [id, name] of Object.entries(commercial.gatewayNames)) {
    assert.ok(html.includes(name)); assert.ok(html.includes(`/pagamentos/${id}`));
  }
  assert.doesNotMatch(html, /type="password"|Webhook conectado/);
  const missing = textOf(React.createElement(GatewayCards, { gateways: [] }));
  assert.match(missing, /Configuração não retornada/); assert.doesNotMatch(missing, /Desabilitado|Sandbox/);
});

test('gateway patch omits empty secrets; environment switch demands replacements; PagBank never sends webhook secret', () => {
  const values = { environment: 'SANDBOX', publicId: '', credentials: '', webhookSecret: '', recurringCredentials: '', recurringEnabled: false };
  const patch = commercial.gatewayPatch(gatewayFixture(), values);
  assert.equal('credentials' in patch, false); assert.equal('webhookSecret' in patch, false);
  assert.throws(() => commercial.gatewayPatch(gatewayFixture(), { ...values, environment: 'PRODUCTION' }));
  const pagbank = commercial.gatewayPatch(gatewayFixture('PAGBANK'), { ...values, credentials: 'new-input', webhookSecret: 'not-allowed', recurringCredentials: 'recurring-input' });
  assert.equal('webhookSecret' in pagbank, false); assert.equal(pagbank.recurringCredentials, 'recurring-input');
});

test('gateway form ignores returned secrets and clears submitted secrets after success and failure', async () => {
  for (const fail of [false, true]) {
    const calls = [];
    const h = harness('components/gateway-form.tsx', 'GatewayForm', { '@/lib/api': { API_URL: 'https://api-dev.kalend.tech', jsonBody: value => ({ body: JSON.stringify(value) }), api: async (path, init) => { calls.push({ path, init }); if (fail) throw new Error('Falha sanitizada'); return gatewayFixture(); } } });
    const props = { gateway: gatewayFixture('STRIPE', { credentials: 'NEVER_RENDER', webhookSecret: 'NEVER_RENDER' }), saved() {} };
    let tree = h.render(props);
    assert.ok(input(tree, 'password').every(n => n.props.value === ''));
    assert.doesNotMatch(textOf(tree), /NEVER_RENDER|\*\*\*\*/);
    input(tree, 'password')[0].props.onChange({ target: { value: 'write-only-input' } });
    tree = h.render(props);
    await nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.equal(JSON.parse(calls[0].init.body).credentials, 'write-only-input');
    assert.equal('webhookSecret' in JSON.parse(calls[0].init.body), false);
    tree = h.render(props); assert.ok(input(tree, 'password').every(n => n.props.value === ''));
    assert.match(textOf(tree), fail ? /Falha sanitizada/ : /Configuração salva/);
  }
});

test('PagBank test shows separate capabilities and re-reads authoritative state even on test failure', async () => {
  for (const fail of [false, true]) {
    const calls = []; let saved;
    const h = harness('components/gateway-form.tsx', 'GatewayForm', { '@/lib/api': { API_URL: 'https://api-dev.kalend.tech', api: async (path, init) => {
      calls.push([path, init?.method]);
      if (path.endsWith('/test')) { if (fail) throw new Error('Teste indisponível'); return { connected: true, checks: { credentials: 'CREDENTIALS_VALID', webhook: 'UNVERIFIED', reconciliation: 'RECONCILIATION_UNVERIFIED' } }; }
      return gatewayFixture('PAGBANK', { status: fail ? 'FAILED' : 'CONNECTED' });
    } } });
    const props = { gateway: gatewayFixture('PAGBANK'), saved: value => { saved = value; } };
    await button(h.render(props), 'Testar conexão').props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [['/payment-gateways/PAGBANK/test', 'POST'], ['/payment-gateways/PAGBANK', undefined]]);
    const html = textOf(h.render({ ...props, gateway: saved }));
    assert.match(html, /entrega não verificada/);
    assert.match(html, fail ? /Teste indisponível/ : /Reconciliação não homologada/);
    assert.doesNotMatch(html, /Webhook conectado|totalmente operacional/);
  }
});

test('gateway page loads the selected provider and rejects unknown routes without API calls', async () => {
  for (const id of ['ASAAS', 'UNKNOWN']) {
    const effects = []; const calls = [];
    const Page = load('app/super-admin/configuracoes/pagamentos/[gateway]/page.tsx', {
      react: { ...React, useEffect: fn => effects.push(fn) }, 'next/link': linkMock,
      'next/navigation': { useParams: () => ({ gateway: id }) },
      '@/components/admin-section': { AdminSection: ({ children }) => children },
      '@/components/gateway-form': { GatewayForm: () => null },
      '@/lib/api': { api: async path => { calls.push(path); return gatewayFixture('ASAAS'); } },
    });
    assert.match(textOf(React.createElement(Page.default)), /Carregando configuração/);
    effects.forEach(fn => fn()); await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(calls, id === 'ASAAS' ? ['/payment-gateways/ASAAS'] : []);
  }
});

test('gateway list exposes loading and retry after sanitized error', async () => {
  const h = harness('app/super-admin/configuracoes/pagamentos/page.tsx', 'default', {
    '@/components/admin-section': { AdminSection: ({ children }) => children },
    '@/lib/api': { api: async () => { throw new Error('Falha de conexão'); } },
  });
  assert.match(textOf(h.render()), /Carregando gateways/);
  await button(h.render(), 'Atualizar').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  const html = textOf(h.render()); assert.match(html, /role="alert"/); assert.match(html, /Tentar novamente/);
});

const planFixture = (id, name) => ({ id, name, code: id, description: null, monthlyPriceCents: 12900, yearlyPriceCents: null, trialEnabled: true, trialDays: 14, isActive: true, isPublic: true, badge: null, isFeatured: false, displayOrder: 0, maxProfessionals: null, maxClients: null, maxUnits: null, maxMessages: null, features: [] });
const regularizationFixture = () => ({ companyId: 'company', accessAllowed: false, status: 'TRIAL_EXPIRED', reason: 'TRIAL_EXPIRED', trialExpired: true,
  subscription: { id: 'trial', status: 'TRIALING', planId: 'premium', planName: 'Premium', billingInterval: 'MONTHLY', trialStartedAt: null, trialEndsAt: '2026-01-01T00:00:00Z', currentPeriodEnd: null, graceEndsAt: null, cancelAtPeriodEnd: false },
  plans: [planFixture('premium', 'Premium'), planFixture('pro', 'Pro')],
  gateways: [{ provider: 'STRIPE', environment: 'SANDBOX', capabilities: gatewayFixture().capabilities }], pendingCheckout: null,
});

test('expired Premium trial allows explicit Pro checkout; no amount, company, status or inherited trial plan is sent', async () => {
  const calls = []; let data = regularizationFixture();
  const h = harness('components/regularization-panel.tsx', 'RegularizationPanel', { '@/lib/api': { jsonBody: value => ({ body: JSON.stringify(value) }), tenantApi: async (company, path, init) => {
    calls.push({ company, path, init });
    if (path === '/billing/checkout') { data = { ...data, pendingCheckout: { id: 'payment', planId: 'pro', gateway: 'STRIPE', billingInterval: 'MONTHLY', checkoutUrl: 'https://checkout.stripe.com/test', creationState: 'CREATED' } }; return data.pendingCheckout; }
    return data;
  } } });
  const props = { companyId: 'company' };
  await button(h.render(props), 'Atualizar estado').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  let tree = h.render(props); assert.match(textOf(tree), /Trial encerrado/);
  assert.ok(input(tree, 'radio').every(n => !n.props.checked));
  input(tree, 'radio').find(n => n.props.value === 'pro').props.onChange();
  nodes(tree, n => n.type === 'select')[1].props.onChange({ target: { value: 'STRIPE' } });
  tree = h.render(props);
  const yearly = nodes(tree, n => n.type === 'option' && n.props.value === 'YEARLY')[0]; assert.equal(yearly.props.disabled, true);
  await nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  const checkout = calls.find(c => c.path === '/billing/checkout');
  assert.deepEqual(JSON.parse(checkout.init.body), { planId: 'pro', billingInterval: 'MONTHLY', gateway: 'STRIPE', idempotencyKey: 'operation-id', recurring: false });
  assert.match(textOf(h.render(props)), /Continuar pagamento/);
  assert.equal(nodes(h.render(props), n => n.type === 'form').length, 0);
});

test('uncertain checkout does not provide a retry purchase or unsafe external link', () => {
  const { PendingPayment } = load('components/regularization-panel.tsx', { '@/lib/api': {} });
  for (const creationState of ['UNCERTAIN', 'CREATING', 'READY']) {
    const html = textOf(React.createElement(PendingPayment, { payment: { id: 'payment', gateway: 'STRIPE', billingInterval: 'MONTHLY', creationState, checkoutUrl: 'https://checkout.stripe.com/test' } }));
    assert.doesNotMatch(html, /href=/); assert.match(html, /reconciliação/);
  }
  for (const url of ['javascript:alert(1)', 'https://user:password@example.test', 'http://example.test']) assert.equal(commercial.safeHttpsUrl(url), null);
});

test('commercial 403 is sanitized, dispatched once and never refreshes or logs out', async () => {
  const payload = { code: 'PLAN_LIMIT_REACHED', feature: 'professionals', current: 5, limit: 5, upgradeRequired: true, secret: 'NEVER_RENDER' };
  const { api, calls, events } = client(() => response(403, payload));
  await assert.rejects(api.api('/existing-resource'), error => error.issue.code === payload.code && error.issue.current === 5 && !JSON.stringify(error.issue).includes('NEVER_RENDER'));
  assert.equal(calls.length, 1); assert.deepEqual(events, ['kalend:commercial-issue']);
});

test('reusable limit notice shows actual usage and grants commercial link only to managers', () => {
  const { PlanLimitNotice } = load('components/commercial-notice.tsx', { 'next/link': linkMock, './auth-provider': {} });
  const issue = { code: 'PLAN_LIMIT_REACHED', feature: 'professionals', current: 5, limit: 5, upgradeRequired: true };
  const html = textOf(React.createElement(PlanLimitNotice, { issue, canManage: true }));
  assert.match(html, /profissionais/); assert.match(html, /Uso atual: 5/); assert.match(html, /Limite: 5/); assert.match(html, /href="\/conta"/);
  assert.doesNotMatch(textOf(React.createElement(PlanLimitNotice, { issue })), /href=/);
});

test('tenant guard for commercial flow uses auth/me, allowing suspended company and blocking stale selection', async () => {
  const { api, calls } = client(path => response(200, path === '/auth/me' ? { selectedCompanyId: 'company' } : regularizationFixture()));
  await api.tenantApi('company', '/billing/regularization');
  assert.deepEqual(calls.map(c => c.path), ['/auth/me', '/billing/regularization']);
  await assert.rejects(api.tenantApi('different-company', '/billing/checkout', { method: 'POST' }));
  assert.equal(calls.filter(c => c.path === '/billing/checkout').length, 0);
});

test('subscription details preserve backend status despite dates and distinguish partial from full refunds', () => {
  const { SubscriptionView } = load('components/subscription-view.tsx');
  const base = { id: 'sub', status: 'ACTIVE', billingInterval: 'MONTHLY', gateway: 'STRIPE', environment: 'SANDBOX', trialStartedAt: null, trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: '2001-01-01T00:00:00Z', graceEndsAt: null, canceledAt: null, cancellationRequestedAt: null, cancelAtPeriodEnd: false, createdAt: '2000-01-01T00:00:00Z', company: { name: 'Example' }, plan: { name: 'Pro' }, payments: [{ id: 'partial', status: 'APPROVED', amountCents: 10000, refundedAmountCents: 2000, gateway: 'STRIPE', environment: 'SANDBOX', periodStart: null, periodEnd: null }, { id: 'full', status: 'REFUNDED', amountCents: 10000, refundedAmountCents: 10000, gateway: 'STRIPE', environment: 'SANDBOX', periodStart: null, periodEnd: null }] };
  const html = textOf(React.createElement(SubscriptionView, { data: base }));
  assert.match(html, /Ativa/); assert.match(html, /Estorno parcial/); assert.match(html, /Estorno total/);
  for (const status of ['PENDING', 'SUSPENDED', 'PAST_DUE', 'TRIALING', 'CANCELED', 'EXPIRED']) assert.ok(textOf(React.createElement(SubscriptionView, { data: { ...base, status } })).includes(commercial.commercialStatuses[status]));
});

test('plan creation includes public visibility/messages and trial settings without seeded features', async () => {
  const calls = [];
  const h = harness('app/super-admin/planos/novo/page.tsx', 'default', {
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    '@/lib/api': { apiFetch: async (path, init) => { calls.push({ path, init }); return response(201); } },
  });
  h.render();
  // Existing form state: name, code, description, monthly price, yearly price, trial flag/days.
  h.state[0] = 'Pro'; h.state[1] = 'pro'; h.state[3] = '129,00';
  let tree = h.render();
  const messages = nodes(tree, n => n.type === 'label' && textOf(n).includes('Limite de mensagens'))[0];
  nodes(messages, n => n.type === 'input')[0].props.onChange({ target: { value: '0' } });
  const visibility = input(tree, 'checkbox')[0]; visibility.props.onChange({ target: { checked: false } });
  tree = h.render();
  assert.match(textOf(tree), /não altera retroativamente trials já iniciados/);
  await nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.isPublic, false); assert.equal(payload.maxMessages, 0); assert.equal(payload.monthlyPriceCents, 12900); assert.deepEqual(payload.features, []);
});

test('missing API URL fails before fetch; no production fallback', async () => {
  let fetched = false;
  const api = load('lib/api.ts', {}, { process: { env: {} }, fetch: async () => { fetched = true; } });
  await assert.rejects(api.api('/auth/login'), /NEXT_PUBLIC_API_URL/); assert.equal(fetched, false);
});


test('zero price is shown as unconfigured and cannot start monthly or annual checkout', () => {
  const plan = { ...planFixture('free', 'Free'), monthlyPriceCents: 0, yearlyPriceCents: 0 };
  const data = { ...regularizationFixture(), plans: [plan] };
  const h = harness('components/regularization-panel.tsx', 'RegularizationPanel', { '@/lib/api': {} });
  h.state[0] = data; h.state[1] = false; h.state[5] = 'free'; h.state[7] = 'STRIPE';
  const tree = h.render({ companyId: 'company' });
  assert.match(textOf(tree), /Preço não configurado para este intervalo/);
  assert.equal(button(tree, 'Iniciar checkout').props.disabled, true);
  assert.equal(nodes(tree, n => n.type === 'option' && n.props.value === 'YEARLY')[0].props.disabled, true);
});

test('Super Admin and plan views use authenticated profile instead of placeholder identity', () => {
  for (const file of ['app/super-admin/page.tsx', 'app/super-admin/planos/page.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /useAuth\(\)/);
    assert.match(source, /profile\?\.user\.name/);
    assert.doesNotMatch(source, /DN|<strong>Administrador<\/strong>/);
  }
  assert.doesNotMatch(fs.readFileSync('app/super-admin/page.tsx', 'utf8'), /notification-button/);
});
