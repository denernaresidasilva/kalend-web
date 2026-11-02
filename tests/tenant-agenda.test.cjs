/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { JSDOM } = require('jsdom');
const loader = require('./helpers/load-ts.cjs');
const bootstrap = new JSDOM('<div id="root"></div>');
for (const name of ['window','document','navigator']) Object.defineProperty(globalThis, name, { configurable: true, value: bootstrap.window[name] ?? bootstrap.window });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('agenda renders persisted confirmation in company timezone and ignores a stale tenant response', async t => {
  const element = document.getElementById('root'); const root = createRoot(element);
  const calls = []; let resolveOld;
  const load = loader({ '@/lib/api': { tenantApi: async (companyId, path, init, userId) => {
    calls.push({ companyId, path, userId });
    if (companyId === 'old') return new Promise(resolve => { resolveOld = resolve; });
    return { timezone: 'America/Sao_Paulo', items: [{ id: 'confirmed', serviceName: 'Corte confirmado', startsAt: '2026-11-02T15:00:00Z', endsAt: '2026-11-02T15:30:00Z', professional: { id: 'p', displayName: 'Profissional QA' }, request: { id: 'r', customer: { name: 'Cliente QA' } } }] };
  } } }, { window, queueMicrotask, URLSearchParams });
  const { TenantAgenda } = load('components/bookings/tenant-agenda.tsx');
  t.after(async () => { await React.act(async () => root.unmount()); bootstrap.window.close(); });
  await React.act(async () => { root.render(React.createElement(TenantAgenda, { companyId: 'old', userId: 'user', revision: 0 })); await tick(); });
  await React.act(async () => { root.render(React.createElement(TenantAgenda, { companyId: 'new', userId: 'user', revision: 1 })); await tick(); });
  assert.match(element.textContent, /Corte confirmado/); assert.match(element.textContent, /12:00/); assert.match(element.textContent, /Cliente QA/);
  await React.act(async () => { resolveOld({ timezone: 'UTC', items: [{ id: 'foreign', serviceName: 'DADO ANTERIOR', startsAt: '2026-11-02T15:00:00Z', endsAt: '2026-11-02T15:30:00Z', professional: { displayName: 'foreign' }, request: { customer: { name: 'foreign' } } }] }); await tick(); });
  assert.doesNotMatch(element.textContent, /DADO ANTERIOR/);
  assert.equal(calls.at(-1).companyId, 'new'); assert.equal(calls.at(-1).userId, 'user'); assert.match(calls.at(-1).path, /^\/booking\/agenda\?date=/);
});
