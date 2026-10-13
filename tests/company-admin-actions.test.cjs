/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function nodes(tree, predicate) {
  const result = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) result.push(node);
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(tree);
  return result;
}

function fixtureCompany(id, name, status, slug) {
  return {
    id, name, slug, timezone: 'America/Sao_Paulo', status,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    owner: { id: `owner-${id}`, name: 'Owner', email: `${id}@example.test` }, usersCount: 1,
    subscription: { id: `sub-${id}`, status: status === 'TRIAL' ? 'TRIALING' : 'ACTIVE', trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, plan: { id: 'plan-id', name: 'Plano QA', code: 'QA' } },
  };
}

function setup(initialCompanies) {
  const state = [initialCompanies, false, '', '', [], null, null, null, '', false, '', ''];
  let cursor = 0;
  let companies = initialCompanies;
  const calls = [];
  const apiFetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url === '/plans') return new Response(JSON.stringify([{ id: 'plan-id', name: 'Plano QA', isActive: true }]));
    if (url === '/companies' && init.method !== 'PATCH' && init.method !== 'DELETE') return new Response(JSON.stringify(companies));
    if (init.method === 'PATCH') {
      const payload = JSON.parse(init.body);
      companies = companies.map((company) => company.id === url.split('/').pop() ? { ...company, ...payload, owner: { ...company.owner, email: payload.ownerEmail } } : company);
      return new Response(JSON.stringify({ ok: true }));
    }
    if (init.method === 'DELETE') return new Response(JSON.stringify({ deleted: true }));
    throw new Error(`Unexpected API call ${init.method} ${url}`);
  };
  const icons = Object.fromEntries(['Building2','Check','ChevronRight','CreditCard','Loader2','Pencil','Plus','Search','Trash2','Users','WalletCards','X'].map((name) => [name, (props) => React.createElement('span', props, name)]));
  const hooks = {
    useState(initial) { const key = cursor++; if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial; return [state[key], (next) => { state[key] = typeof next === 'function' ? next(state[key]) : next; }]; },
    useEffect() {}, useMemo(fn) { return fn(); }, useCallback(fn) { return fn; },
  };
  const link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
  const mocks = { react: hooks, 'next/link': link, 'next/navigation': { useRouter: () => ({ push() {} }) }, '@/lib/api': { apiFetch }, 'lucide-react': icons };
  function load(file) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const mod = { exports: {} };
    vm.runInNewContext(output, { module: mod, exports: mod.exports, require: (id) => mocks[id] ?? require(id), console, setTimeout, clearTimeout }, { filename: file });
    return mod.exports;
  }
  const Page = load(path.resolve('app/super-admin/empresas/page.tsx')).default;
  function render() { cursor = 0; return Page(); }
  return { render, calls, state };
}

test('company edit submits only supported fields and updates the visible list from the refreshed result', async () => {
  const company = fixtureCompany('a', 'Empresa A', 'ACTIVE', 'empresa-a');
  const app = setup([company]);
  let tree = app.render();
  const edit = nodes(tree, (node) => node.type === 'button' && node.props['aria-label'] === 'Editar empresa Empresa A')[0];
  await edit.props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  tree = app.render();
  const dialog = nodes(tree, (node) => node.props?.role === 'dialog' && node.props['aria-labelledby'] === 'company-edit-title')[0];
  assert.ok(dialog);
  app.state[6] = { name: 'Empresa A atualizada', slug: 'empresa-a-nova', timezone: 'UTC', status: 'ACTIVE', ownerEmail: 'owner-a@example.test', planId: 'plan-id' };
  tree = app.render();
  const activeForm = nodes(tree, (node) => node.type === 'form')[0];
  await activeForm.props.onSubmit({ preventDefault() {} });
  assert.equal(app.calls.find((call) => call.init.method === 'PATCH').url, '/companies/a');
  const { planId, ...expected } = app.state[6];
  assert.ok(planId);
  assert.deepEqual(JSON.parse(app.calls.find((call) => call.init.method === 'PATCH').init.body), expected);
  assert.ok(app.calls.some((call) => call.url === '/companies'));
  tree = app.render();
  assert.ok(nodes(tree, (node) => node.type === 'strong' && node.props.children === 'Empresa A atualizada').length);
});

test('delete does not call the API until exact-name confirmation and removes the row so summary counts recalculate', async () => {
  const app = setup([fixtureCompany('a', 'Empresa A', 'ACTIVE', 'empresa-a'), fixtureCompany('b', 'Empresa B', 'TRIAL', 'empresa-b')]);
  let tree = app.render();
  const remove = nodes(tree, (node) => node.type === 'button' && node.props['aria-label'] === 'Excluir empresa Empresa A')[0];
  remove.props.onClick();
  tree = app.render();
  let deleteButton = nodes(tree, (node) => node.type === 'button' && node.props.children?.some?.((child) => child?.type?.name === 'Trash2') && String(node.props.children).includes('Excluir definitivamente'))[0];
  deleteButton = nodes(tree, (node) => node.type === 'button' && node.props.disabled === true && node.props.onClick && node.props.className === 'company-modal-delete')[0];
  assert.ok(deleteButton);
  await deleteButton.props.onClick();
  assert.equal(app.calls.some((call) => call.init.method === 'DELETE'), false);

  const confirmationInput = nodes(tree, (node) => node.type === 'input' && !node.props.type && node.props.autoComplete === 'off')[0];
  confirmationInput.props.onChange({ target: { value: 'Empresa A' } });
  tree = app.render();
  deleteButton = nodes(tree, (node) => node.type === 'button' && node.props.className === 'company-modal-delete')[0];
  assert.equal(deleteButton.props.disabled, false);
  await deleteButton.props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  tree = app.render();
  assert.equal(app.calls.filter((call) => call.init.method === 'DELETE').length, 1);
  assert.equal(app.state[0].length, 1);
  const summaries = nodes(tree, (node) => node.type === 'strong').map((node) => node.props.children);
  assert.ok(summaries.includes(1));
  assert.equal(nodes(tree, (node) => node.type === 'button' && node.props['aria-label'] === 'Editar empresa Empresa A').length, 0);
});
