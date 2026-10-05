/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');
function load(file, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id);
      return load(['.ts', '.tsx'].map(ext => base + ext).find(p => fs.existsSync(p)), mocks, globals);
    }
    return require(id);
  }, setTimeout, clearTimeout, setInterval, clearInterval, URL, AbortController, Date, Error,
  process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example.test' } }, ...globals }, { filename: file });
  return mod.exports;
}
const qr = 'data:image/png;base64,iVBORw0KGgo=';
const connection = extra => ({ status: 'PENDING', phone: null, profileName: null, connectedAt: null, qrCode: null, qrExpiresAt: null, pairingCode: null, pairingExpiresAt: null, pairingSupported: true, errorCode: null, message: null, ...extra });
const mocks = { '@/lib/communication': { safeQr: value => /^data:image\/png;base64,/.test(value) ? value : null }, './auth-provider': { useAuth: () => ({ loading: false, profile: null }) } };
const view = load('components/evolution-settings.tsx', mocks).EvolutionView;
const html = (row, busy = false) => renderToStaticMarkup(React.createElement(view, { row, busy, now: Date.parse('2026-10-05T12:00:00Z') }));
for (const [name, row, text] of [
  ['sem conexão', null, 'Conecte seu WhatsApp'], ['carregando', connection(), 'Gerando QR Code'],
  ['QR disponível', connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: '2026-10-05T12:01:00Z' }), 'QR Code para conectar'],
  ['QR expirado', connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: '2026-10-05T11:59:00Z' }), 'Este QR Code expirou'],
  ['conectando', connection({ status: 'CONNECTING' }), 'Conectando...'],
  ['conectado', connection({ status: 'CONNECTED', phone: '+5511999999999', profileName: 'Maria' }), 'WhatsApp conectado'],
  ['desconectado', connection({ status: 'DISCONNECTED' }), 'WhatsApp desconectado'],
  ['erro transitório', connection({ status: 'ERROR', message: 'private stack' }), 'temporariamente indisponível'],
  ['pairing', connection({ status: 'CONNECTING', pairingCode: 'ABCD1234', pairingExpiresAt: '2026-10-05T12:01:00Z' }), 'ABCD1234'],
]) test(`Evolution UX: ${name}`, () => assert.ok(html(row, !row).includes(text)));
test('expired and connected QR never render; internal fields and raw errors are ignored', () => {
  for (const row of [connection({ status: 'CONNECTED', qrCode: qr }), connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: '2026-10-05T11:59:00Z' })]) assert.doesNotMatch(html(row), /<img/);
  assert.doesNotMatch(html(connection({ status: 'ERROR', apiKey: 'private-key', instanceName: 'other-instance', companyId: 'company-b', message: 'raw-stack' })), /private-key|other-instance|company-b|raw-stack/);
});
test('API routes use authenticated tenant client with exact bodies and no identity fields', async () => {
  const calls = [];
  const { evolutionApi } = load('lib/evolution.ts', { './api': { tenantApi: async (...args) => { calls.push(args); return connection(); }, jsonBody: value => ({ body: JSON.stringify(value) }) } });
  const ctx = { companyId: 'company-a', userId: 'user-a' };
  await evolutionApi.get(ctx);
  for (const action of ['prepare', 'connect', 'reconnect', 'logout', 'remove', 'pairing-code']) await evolutionApi.action(ctx, action, '+5511999999999');
  assert.ok(calls.every(([company, url, , user]) => company === 'company-a' && user === 'user-a' && url.startsWith('/company/communication/evolution') && !url.includes('company-a')));
  assert.deepEqual(JSON.parse(calls.at(-1)[2].body), { phone: '5511999999999' });
  assert.equal(calls[5][2].method, 'DELETE');
  assert.ok(calls.every(c => !/companyId|instanceName|apiKey/.test(c[2].body ?? '')));
});
async function mounted(api, options = {}) {
  const intervals = new Map();
  const dom = new JSDOM('<div id="app"></div>', { url: 'https://web.example.test' });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.confirm = () => true;
  const exports = load('components/evolution-settings.tsx', { ...mocks, '@/lib/evolution': { ...load('lib/evolution.ts'), evolutionApi: api } }, { window: dom.window, document: dom.window.document, setInterval: (fn, ms) => { const id = setInterval(fn, ms); intervals.set(id, ms); return id; }, clearInterval: id => { intervals.delete(id); clearInterval(id); } });
  const root = createRoot(document.getElementById('app'));
  await React.act(async () => root.render(React.createElement(exports.EvolutionPanel, { context: options.context ?? { companyId: 'company-a', userId: 'user-a' }, initiallyOpen: options.initiallyOpen ?? false })));
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent === text);
  const click = async text => { const target = button(text); assert.ok(target, text); await React.act(async () => target.click()); };
  return { intervals, click, button, text: () => document.body.textContent, close: async () => { await React.act(async () => root.unmount()); dom.window.close(); delete global.window; delete global.document; delete global.IS_REACT_ACT_ENVIRONMENT; } };
}
test('configure, QR, reconnect, number flow and deletion use the same context', async () => {
  const calls = [];
  const h = await mounted({ get: async () => connection({ status: 'DISCONNECTED' }), action: async (ctx, action) => {
    calls.push([ctx, action]);
    return connection(action === 'pairing-code' ? { status: 'CONNECTING', pairingCode: 'ABCD1234', pairingExpiresAt: new Date(Date.now() + 45000).toISOString() } : action === 'remove' ? {} : { status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: new Date(Date.now() + 45000).toISOString() });
  } });
  try {
    await h.click('Configurar'); assert.match(h.text(), /Escaneie/);
    await h.click('Conectar usando número de telefone'); assert.ok(document.querySelector('input[type=tel]'));
    const field = document.querySelector('input');
    const props = field[Object.keys(field).find(key => key.startsWith('__reactProps'))];
    await React.act(async () => props.onChange({ target: { value: '+5511999999999' } }));
    await React.act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.match(h.text(), /ABCD1234/);
    await h.click('Atualizar estado'); await h.click('Reconectar');
    await h.click('Excluir conexão'); assert.ok(h.button('Configurar'));
    assert.ok(calls.every(([ctx]) => ctx.companyId === 'company-a' && ctx.userId === 'user-a'));
    assert.ok(calls.some(([, action]) => action === 'reconnect'));
  } finally { await h.close(); }
});
for (const event of ['kalend:tenant-changed', 'kalend:session-ended', 'kalend:signed-in']) test(`late requests discarded on ${event}`, async () => {
  let resolve;
  const h = await mounted({ get: async () => connection(), action: () => new Promise(r => { resolve = r; }) });
  try {
    await h.click('Configurar');
    await React.act(async () => window.dispatchEvent(new window.Event(event)));
    await React.act(async () => resolve(connection({ status: 'CONNECTED', phone: '+5511888888888' })));
    assert.doesNotMatch(h.text(), /5511888888888/); assert.match(h.text(), /sessão ou empresa mudou/);
  } finally { await h.close(); }
});
test('second-tab tenant mismatch never renders another company QR', async () => {
  const h = await mounted({ get: async () => { throw Error('company-b'); }, action: async () => { throw Error('company-b private'); } });
  try { await h.click('Configurar'); assert.doesNotMatch(h.text(), /company-b|private/); assert.match(h.text(), /Aguarde e tente novamente/); assert.equal(document.querySelector('img'), null); }
  finally { await h.close(); }
});
test('connected UI logs out and clears QR', async () => {
  const calls = [];
  const h = await mounted({ get: async () => connection(), action: async (_ctx, action) => { calls.push(action); return connection({ status: action === 'logout' ? 'DISCONNECTED' : 'CONNECTED', phone: '+5511999999999' }); } });
  try { await h.click('Configurar'); await h.click('Desconectar WhatsApp'); assert.match(h.text(), /WhatsApp desconectado/); assert.equal(document.querySelector('img'), null); assert.deepEqual(calls, ['prepare', 'logout']); }
  finally { await h.close(); }
});

test('management UI authorizes only OWNER/ADMIN and remounts for tenant/user identity', () => {
  for (const role of ['OWNER', 'ADMIN', 'PROFESSIONAL', 'RECEPTIONIST', 'CLIENT']) {
    const profile = { user: { id: 'user-a' }, selectedCompanyId: 'company-a', memberships: [{ role, company: { id: 'company-a' } }] };
    const Settings = load('components/evolution-settings.tsx', { ...mocks, './auth-provider': { useAuth: () => ({ profile, loading: false }) } }).EvolutionSettings;
    const tree = Settings();
    if (['OWNER', 'ADMIN'].includes(role)) { assert.equal(tree.key, 'user-a:company-a'); assert.equal(tree.props.context.companyId, 'company-a'); }
    else assert.match(renderToStaticMarkup(tree), /não autorizado/);
  }
});


test('GLOBAL prepares automatically on entry and has moderate polling that stops when connected', async () => {
  const calls = [];
  const h = await mounted({ get: async () => connection({ status: 'CONNECTED' }), action: async (ctx, action) => { calls.push([ctx, action]); return connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: new Date(Date.now() + 45000).toISOString() }); } }, { context: { scope: 'GLOBAL', userId: 'admin' }, initiallyOpen: true });
  try {
    await React.act(async () => { await new Promise(r => setTimeout(r, 20)); });
    assert.equal(calls.length, 1); assert.equal(calls[0][0].scope, 'GLOBAL'); assert.equal(calls[0][1], 'prepare');
    assert.equal(document.querySelector('img').src, qr); assert.ok([...h.intervals.values()].every(ms => ms === 10000));
    assert.equal(h.intervals.size, 1); assert.doesNotMatch(h.text(), /Sandbox|Gerar novo QR|Instance Name|API Key/);
    await h.click('Atualizar estado'); assert.equal(h.intervals.size, 0); assert.equal(document.querySelector('img'), null);
  } finally { await h.close(); }
});
for (const event of ['kalend:tenant-changed', 'kalend:session-ended']) test(`polling is cancelled on ${event}`, async () => {
  let signal;
  const h = await mounted({ get: async () => connection(), action: async (_ctx, _action, _phone, abortSignal) => { signal = abortSignal; return connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: new Date(Date.now() + 45000).toISOString() }); } });
  try {
    await h.click('Configurar'); assert.equal(h.intervals.size, 1);
    await React.act(async () => window.dispatchEvent(new window.Event(event)));
    assert.equal(signal.aborted, true); assert.equal(h.intervals.size, 0); assert.equal(document.querySelector('img'), null);
  } finally { await h.close(); }
});
test('GLOBAL client uses distinct routes, validates administrator identity, and normalizes pairing input', async () => {
  const calls = [];
  const client = load('lib/evolution.ts', { './api': { api: async (url, init) => { calls.push([url, init]); return url === '/auth/me' ? { user: { id: 'admin' }, systemRole: 'SUPER_ADMIN' } : connection(); }, tenantApi: () => { throw Error('GLOBAL must not use tenant client'); }, jsonBody: value => ({ body: JSON.stringify(value) }) } });
  await client.evolutionApi.action({ scope: 'GLOBAL', userId: 'admin' }, 'pairing-code', '+55 (11) 99999-9999');
  assert.equal(calls[1][0], '/communication/evolution/pairing-code'); assert.deepEqual(JSON.parse(calls[1][1].body), { phone: '5511999999999' });
  await assert.rejects(() => client.evolutionApi.action({ scope: 'GLOBAL', userId: 'another-user' }, 'prepare'), /sessão mudou/);
  assert.throws(() => client.normalizeEvolutionPhone('invalid'), /válido/);
  for (const role of ['USER', 'SUPER_ADMIN']) {
    const profile = { user: { id: 'admin' }, systemRole: role, memberships: [], selectedCompanyId: null };
    const Settings = load('components/evolution-settings.tsx', { ...mocks, './auth-provider': { useAuth: () => ({ profile, loading: false }) } }).EvolutionSettings;
    const tree = Settings({ scope: 'GLOBAL' });
    if (role === 'SUPER_ADMIN') { assert.equal(tree.key, 'admin:GLOBAL'); assert.equal(tree.props.context.scope, 'GLOBAL'); }
    else assert.match(renderToStaticMarkup(tree), /não autorizado/);
  }
});
test('phone QR fallback and expiration render safely without changing provider code format', () => {
  assert.match(html(connection({ status: 'QR_AVAILABLE', qrCode: qr, qrExpiresAt: '2026-10-05T12:01:00Z', errorCode: 'PAIRING_CODE_UNAVAILABLE' })), /<img/);
  assert.match(html(connection({ status: 'CONNECTING', pairingCode: 'ABCD-1234', pairingExpiresAt: '2026-10-05T12:01:00Z' })), /ABCD-1234/);
  assert.doesNotMatch(html(connection({ status: 'CONNECTING', pairingCode: 'ABCD-1234', pairingExpiresAt: '2026-10-05T11:59:00Z' })), /ABCD-1234/);
});

test('native Evolution frontend has no direct provider endpoint, API key, technical instance input or persisted QR', () => {
  for (const file of ['lib/evolution.ts','components/evolution-settings.tsx','app/conta/comunicacao/page.tsx']) {
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source,/NEXT_PUBLIC_EVOLUTION_API_KEY|evolution-api\.kalend\.tech|localStorage|sessionStorage|apikey|instanceName|webhookSecret/);
  }
});

test('expired QR remains hidden and indicates recovery on the same connection', () => {
  const result=html(connection({status:'QR_AVAILABLE',qrCode:qr,qrExpiresAt:'2026-10-05T11:59:00Z'}));
  assert.match(result,/mesma conexão/); assert.doesNotMatch(result,/<img/);
});
