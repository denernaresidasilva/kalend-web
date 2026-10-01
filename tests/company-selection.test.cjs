/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const loaded = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id);
      return load(['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate)), mocks, globals);
    }
    return require(id);
  }, setTimeout, clearTimeout, Error, ...globals });
  return loaded.exports;
}
function profile(count, extra = {}) {
  return { user: { id: 'fixture-user', name: 'Fixture' }, systemRole: 'USER', selectedCompanyId: null,
    memberships: Array.from({ length: count }, (_, index) => ({ id: `membership-${index}`, role: 'OWNER', company: { id: `company-${index}`, name: `Empresa ${index}`, status: 'ACTIVE', isActive: true } })), ...extra };
}
function fixture(count, options = {}) {
  let me = options.profile || profile(count);
  const calls = []; let changed = 0;
  const transport = { api: async (route, init) => {
    calls.push([route, init]);
    if (route === '/auth/me') return options.current || me;
    if (options.reject) throw new Error('Acesso não autorizado.');
    const { companyId } = JSON.parse(init.body);
    me = options.result || { ...me, selectedCompanyId: companyId };
    return me;
  }, jsonBody: body => ({ body: JSON.stringify(body) }), withTenantLock: async fn => fn(), tenantChanged: () => changed++ };
  const helper = load('lib/company-selection.ts', { './api': transport });
  return { helper, transport, calls, me: () => me, changed: () => changed };
}
function harness(file, mocks) {
  const states = []; const effects = []; let cursor = 0;
  const hooks = { ...React, useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], next => states[i] = next]; }, useEffect(effect) { effects.push(effect); } };
  const exports = load(file, { react: hooks, ...mocks }, { FormData: class { get(key) { return key === 'email' ? 'fixture@example.test' : 'fixture-password'; } } });
  return { render(name, props) { cursor = 0; return exports[name](props); }, runEffects() { return effects.map(effect => effect()); } };
}
function nodes(tree, predicate) {
  const found = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (predicate(node)) found.push(node); React.Children.toArray(node.props?.children).forEach(visit); }
  visit(tree); return found;
}
for (const count of [0,1,2,5]) test(`login preparation with ${count} companies`, async () => {
  const f = fixture(count); const before = f.me(); const prepared = await f.helper.prepareLogin(before);
  assert.equal(prepared.selectedCompanyId, count === 1 ? 'company-0' : null);
  assert.equal(f.calls.filter(([, init]) => init?.method === 'POST').length, count === 1 ? 1 : 0);
  assert.equal(f.changed(), count === 1 ? 1 : 0);
});
for (const count of [0,1,2,5]) test(`selector only rendered when ${count} companies > 1`, () => {
  const f = fixture(count);
  const { CompanySelector } = load('components/company-selector.tsx', { '@/lib/company-selection': f.helper, react: { ...React, useState: initial => [initial, () => {}] } });
  const tree = CompanySelector({ profile: f.me(), busy: false, select: async () => {} });
  const html = tree ? renderToStaticMarkup(tree) : '';
  assert.equal(html.includes('Selecionar empresa'), count > 1);
  assert.equal(nodes(tree, node => node.type === 'select').length, count > 1 ? 1 : 0);
  if (count > 1) assert.equal(nodes(tree, node => node.type === 'option').length, count + 1);
});
test('manual selection registers only linked company; confirms selectedCompanyId from backend', async () => {
  const f = fixture(2); const selected = await f.helper.selectCompany(f.me(), 'company-1');
  assert.equal(selected.selectedCompanyId, 'company-1'); assert.equal(f.changed(), 1);
  assert.deepEqual(JSON.parse(f.calls[1][1].body), { companyId: 'company-1' });
});
test('empty/foreign company is rejected before POST', async () => {
  const f = fixture(2);
  for (const id of ['', 'foreign-company']) await assert.rejects(f.helper.selectCompany(f.me(), id));
  assert.equal(f.calls.length, 0);
});
test('revoked membership or changed session user blocks stale manual choice', async () => {
  for (const current of [profile(0), profile(2, { user: { id: 'foreign-user' } })]) {
    const f = fixture(2, { current }); await assert.rejects(f.helper.selectCompany(f.me(), 'company-1'));
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0][0], '/auth/me');
  }
});
test('backend remains authority: rejected tenant does not update context or navigate', async () => {
  const f = fixture(2, { reject: true }); await assert.rejects(f.helper.selectCompany(f.me(), 'company-0'));
  assert.equal(f.changed(), 0); assert.equal(f.me().selectedCompanyId, null);
});
test('mismatched selectedCompanyId response is rejected', async () => {
  const f = fixture(2, { result: profile(2, { selectedCompanyId: 'foreign-company' }) });
  await assert.rejects(f.helper.selectCompany(f.me(), 'company-0')); assert.equal(f.changed(), 0);
});
test('already-selected sole company needs no duplicate tenant mutation', async () => {
  const f = fixture(1, { profile: profile(1, { selectedCompanyId: 'company-0' }) });
  await f.helper.prepareLogin(f.me()); assert.equal(f.calls.length, 1);
});
test('recovery memberships remain selectable; duplicated memberships do not show selector', () => {
  const f = fixture(1); const me = f.me(); me.memberships[0].company.status = 'SUSPENDED'; me.memberships[0].company.isActive = false;
  me.memberships.push(me.memberships[0]); assert.equal(f.helper.linkedCompanies(me).length, 1);
});
test('destination preserves existing role routes', () => {
  const f = fixture(1);
  for (const role of ['OWNER','ADMIN','RECEPTIONIST','PROFESSIONAL','CLIENT']) {
    const me = profile(1); me.memberships[0].role = role; assert.equal(f.helper.accountDestination(me), '/conta');
  }
  assert.equal(f.helper.accountDestination(profile(0, { systemRole: 'SUPER_ADMIN' })), '/super-admin');
});
for (const count of [0,1,2,5]) test(`login UI with ${count} memberships follows correct selection/navigation`, async () => {
  const f = fixture(count); const redirects = [];
  const h = harness('app/page.tsx', {
    '@/lib/company-selection': f.helper,
    '@/lib/api': { ...f.transport, api: async () => ({}), sessionStarted() {}, ApiError: class extends Error {} },
    '@/components/auth-provider': { useAuth: () => ({ reload: async () => f.me() }) },
    'next/navigation': { useRouter: () => ({ replace: route => redirects.push(route) }) },
  });
  const password = { value: 'fixture-password' };
  const tree = h.render('default');
  await nodes(tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: { reset() {}, elements: { namedItem: () => password } } });
  assert.equal(password.value, '');
  const next = h.render('default');
  const selectors = nodes(next, node => typeof node.type === 'function' && node.type.name === 'CompanySelector');
  assert.equal(selectors.length, count > 1 ? 1 : 0);
  assert.deepEqual(redirects, count > 1 ? [] : ['/conta']);
  if (count > 1) { await selectors[0].props.select('company-1'); assert.deepEqual(redirects, ['/conta']); assert.equal(f.me().selectedCompanyId, 'company-1'); }
});
for (const count of [0,1,2,5]) test(`account UI does not expose empty or sole-company selector (${count})`, () => {
  const f = fixture(count);
  const h = harness('app/conta/page.tsx', {
    '@/lib/company-selection': f.helper,
    '@/components/auth-provider': { useAuth: () => ({ profile: f.me(), loading: false, error: '', reload: async () => f.me(), logout: async () => {} }) },
    '@/components/push-settings': { PushSettings: () => null },
    '@/components/regularization-panel': { RegularizationPanel: () => null },
    'next/link': ({ children }) => React.createElement('a', null, children),
  });
  const tree = h.render('default');
  assert.equal(nodes(tree, node => typeof node.type === 'function' && node.type.name === 'CompanySelector').length, count > 1 ? 1 : 0);
  if (!count) assert.match(renderToStaticMarkup(tree), /Nenhuma empresa vinculada/);
  if (count === 1) assert.equal(nodes(tree, node => typeof node.type === 'function' && node.type.name === 'PushSettings').length, 0);
});
test('Push uses company selected at login and blocks a later stale company', async () => {
  const f = fixture(1); const selected = await f.helper.prepareLogin(f.me());
  let operations = 0;
  const push = load('lib/push/client.ts', { '../api': f.transport });
  await push.inContext(selected, async () => operations++); assert.equal(operations, 1);
  f.me().selectedCompanyId = 'company-other';
  await assert.rejects(push.inContext({ ...selected, selectedCompanyId: 'company-0' }, async () => operations++));
  assert.equal(operations, 1);
});

test('direct account access automatically selects sole membership before mounting Push', async () => {
  const f = fixture(1);
  const h = harness('app/conta/page.tsx', {
    '@/lib/company-selection': f.helper,
    '@/components/auth-provider': { useAuth: () => ({ profile: f.me(), loading: false, error: '', reload: async () => f.me(), logout: async () => {} }) },
    '@/components/push-settings': { PushSettings: () => null },
    '@/components/regularization-panel': { RegularizationPanel: () => null },
    'next/link': ({ children }) => React.createElement('a', null, children),
  });
  h.render('default'); const cleanup = h.runEffects(); await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.me().selectedCompanyId, 'company-0');
  const tree = h.render('default');
  assert.equal(nodes(tree, node => typeof node.type === 'function' && node.type.name === 'CompanySelector').length, 0);
  assert.equal(nodes(tree, node => typeof node.type === 'function' && node.type.name === 'PushSettings').length, 1);
  cleanup.forEach(fn => fn?.());
});
test('failed automatic tenant selection preserves authenticated UI and never navigates', async () => {
  const f = fixture(1, { reject: true }); const redirects = []; let logins = 0;
  const h = harness('app/page.tsx', {
    '@/lib/company-selection': f.helper,
    '@/lib/api': { ...f.transport, api: async () => { logins++; return {}; }, sessionStarted() {}, ApiError: class extends Error {} },
    '@/components/auth-provider': { useAuth: () => ({ reload: async () => f.me() }) },
    'next/navigation': { useRouter: () => ({ replace: route => redirects.push(route) }) },
  });
  await nodes(h.render('default'), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: { reset() {}, elements: { namedItem: () => ({ value: '' }) } } });
  const tree = h.render('default'); assert.equal(nodes(tree, node => node.type === 'form').length, 0);
  assert.equal(redirects.length, 0); assert.equal(logins, 1);
  const retry = nodes(tree, node => node.type === 'button' && node.props.children === 'Tentar acessar a empresa')[0];
  retry.props.onClick(); await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(logins, 1); assert.equal(redirects.length, 0);
});
test('Super Admin with memberships must select before redirecting to its existing panel', async () => {
  const f = fixture(2, { profile: profile(2, { systemRole: 'SUPER_ADMIN' }) }); const redirects = [];
  const h = harness('app/page.tsx', {
    '@/lib/company-selection': f.helper,
    '@/lib/api': { ...f.transport, api: async () => ({}), sessionStarted() {}, ApiError: class extends Error {} },
    '@/components/auth-provider': { useAuth: () => ({ reload: async () => f.me() }) },
    'next/navigation': { useRouter: () => ({ replace: route => redirects.push(route) }) },
  });
  await nodes(h.render('default'), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: { reset() {}, elements: { namedItem: () => ({ value: '' }) } } });
  assert.equal(redirects.length, 0);
  const selector = nodes(h.render('default'), node => typeof node.type === 'function' && node.type.name === 'CompanySelector')[0];
  await selector.props.select('company-1'); assert.deepEqual(redirects, ['/super-admin']);
});
