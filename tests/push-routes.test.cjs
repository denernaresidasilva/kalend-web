/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module: mod, exports: mod.exports, require: name => mocks[name] });
  return mod.exports;
}
const selection = load('lib/company-selection.ts', { './api': {} });
const { pushPromptAllowed } = load('lib/push/routes.ts', { '../company-selection': selection });
const destinations = { OWNER: '/painel/proprietario', ADMIN: '/painel/proprietario', PROFESSIONAL: '/painel/profissional', RECEPTIONIST: '/painel/recepcionista', CLIENT: '/painel/cliente' };
function profile(role) { return { user: { id: 'user' }, systemRole: 'USER', selectedCompanyId: 'company', memberships: [{ role, company: { id: 'company' } }] }; }
for (const role of Object.keys(destinations)) test(`${role}: session membership determines panel and push access`, () => {
  const me = profile(role);
  assert.equal(selection.accountDestination(me), destinations[role]);
  assert.equal(pushPromptAllowed(me, destinations[role]), true);
  assert.equal(pushPromptAllowed(me, '/conta/notificacoes'), true);
  assert.equal(pushPromptAllowed(me, '/super-admin'), false);
  for (const other of Object.values(destinations).filter(route => route !== destinations[role])) assert.equal(pushPromptAllowed(me, other), false);
});
for (const route of ['/', '/login', '/cadastro', '/primeiro-acesso', '/recuperar-senha', '/planos', '/publica', '/super-admin', ...Object.values(destinations)]) test(`visitor and PWA visitor: no push at ${route}`, () => {
  assert.equal(pushPromptAllowed(null, route), false);
  if (!route.startsWith('/super-admin') && !route.startsWith('/painel')) assert.equal(pushPromptAllowed(profile('OWNER'), route), false);
});
test('missing or stale company blocks authenticated and installed PWA push', () => {
  for (const selectedCompanyId of [null, 'foreign']) for (const route of ['/conta', '/conta/notificacoes', '/painel/proprietario']) assert.equal(pushPromptAllowed({ ...profile('OWNER'), selectedCompanyId }, route), false);
});
test('Super Admin needs no company and remains excluded from public routes', () => {
  const me = { ...profile('OWNER'), systemRole: 'SUPER_ADMIN', selectedCompanyId: null, memberships: [] };
  assert.equal(pushPromptAllowed(me, '/super-admin'), true);
  assert.equal(pushPromptAllowed(me, '/super-admin/comunicacao'), true);
  assert.equal(pushPromptAllowed(me, '/conta/notificacoes'), true);
  assert.equal(pushPromptAllowed(me, '/'), false);
  assert.equal(pushPromptAllowed(me, '/planos'), false);
});
