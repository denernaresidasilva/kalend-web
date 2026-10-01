/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true, experimentalDecorators: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = (id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id)).replace(/\.js$/, '');
      return load(['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file)), mocks, globals);
    }
    return require(id);
  }, process: { env: { NEXT_PUBLIC_API_URL: 'https://local.example.test' } }, setTimeout, clearTimeout, URL, AbortController, Error, Buffer, ...globals }, { filename: file });
  return loaded.exports;
}
function nodes(tree, predicate) {
  const result = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (predicate(node)) result.push(node); React.Children.toArray(node.props?.children).forEach(visit); }
  visit(tree); return result;
}
function harness(file, name, props, mocks = {}, globals = {}) {
  const states = []; const refs = []; let cursor = 0; let refCursor = 0;
  const hooks = { ...React, useContext: () => mocks.__context?.() ?? null, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; } };
  const Component = load(file, { react: hooks, ...mocks }, { window: { confirm: () => true }, ...globals })[name];
  const render = () => { cursor = 0; refCursor = 0; return Component(props); };
  return { render, states, html: () => renderToStaticMarkup(render()) };
}
const contract = load('lib/communication.ts', { './api': { api() {}, jsonBody: value => ({ body: JSON.stringify(value) }) } });
const provider = (name = 'SMTP', extra = {}) => ({ provider: name, scope: 'GLOBAL', environment: 'SANDBOX', enabled: false, configured: true, status: 'PENDING_VALIDATION', revision: 1, adapterAvailable: true, config: name === 'SMTP' ? { host: 'smtp.example.test', port: '587', secure: 'false', username: 'kalend', fromName: 'Kalend', fromEmail: 'admin@example.test', replyTo: '' } : {}, lastVerifiedAt: null, lastSentAt: null, lastError: null, ...extra });
const fixture = (data, extra = {}) => ({ data, loading: false, error: '', load: async () => true, ...extra });
const resourceMock = data => ({ useCommunicationResource: () => fixture(data), ResourceState: ({ children, loading, error }) => loading ? React.createElement('p', { role: 'status' }, 'Carregando comunicação…') : error ? React.createElement('p', { role: 'alert' }, error) : children, Feedback: ({ busy, error, message }) => React.createElement('div', null, busy ? 'Processando…' : '', error, message) });
function labelInput(tree, label) { const node = nodes(tree, n => n.type === 'label' && React.Children.toArray(n.props.children)[0] === label)[0]; return nodes(node, n => ['input', 'select', 'textarea'].includes(n.type))[0]; }
const click = (tree, label) => nodes(tree, n => n.type === 'button' && n.props.children === label)[0].props.onClick();
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('communication API uses only confirmed global endpoints and exact bodies', async () => {
  const calls = [];
  const { communication: api } = load('lib/communication.ts', { './api': { api: async (url, init) => { calls.push([url, init?.method ?? 'GET', init?.body ? JSON.parse(init.body) : undefined]); return {}; }, jsonBody: body => ({ body: JSON.stringify(body) }) } });
  for (const name of ['providers', 'events', 'templates', 'metaTemplates', 'outbox', 'deliveries', 'failures', 'logs']) await api[name]();
  await api.patchProvider('SMTP', { config: { port: '587', secure: 'false' }, environment: 'SANDBOX', secrets: { password: 'test-only' } });
  await api.test('SMTP'); await api.sendTest('SMTP'); await api.pair();
  await api.sendTest('META', { id: '123', name: 'hello', language: 'pt_BR', parameters: [] });
  await api.saveTemplate('TRIAL_STARTED', 'EMAIL', { provider: 'SMTP', enabled: false, content: { subject: 'Olá', text: '{{nome}}' } });
  await api.syncMeta(); await api.syncMeta('cursor'); await api.createMeta({ name: 'hello', language: 'pt_BR', category: 'UTILITY', text: 'Olá' }); await api.reprocess('delivery');
  assert.deepEqual(calls.slice(0, 8).map(call => call[0]), ['/communication/providers', '/communication/events', '/communication/templates', '/communication/meta/templates', '/communication/outbox', '/communication/deliveries', '/communication/failures', '/communication/logs']);
  assert.deepEqual(calls[10], ['/communication/providers/SMTP/send-test', 'POST', {}]);
  assert.deepEqual(calls[12][2], { template: { id: '123', name: 'hello', language: 'pt_BR', parameters: [] } });
  assert.deepEqual(calls[15][2], { after: 'cursor' });
  assert.ok(calls.every(call => call[0].startsWith('/communication/') && !call[0].includes('?')));
});
test('provider patch keeps string TLS contract, omits blank secrets and refuses Gmail SMTP', () => {
  const config = provider().config;
  const empty = contract.providerPatch('SMTP', { ...config, unexpected: 'private' }, { password: '' }, 'SANDBOX');
  assert.equal(empty.config.port, '587'); assert.equal(empty.config.secure, 'false'); assert.equal('secrets' in empty, false); assert.equal('unexpected' in empty.config, false);
  const changed = contract.providerPatch('META', { phoneNumberId: '123', businessAccountId: '456', graphVersion: 'v25.0' }, { accessToken: 'test-only', password: 'not-allowed' }, 'SANDBOX');
  assert.equal(changed.secrets.accessToken, 'test-only'); assert.equal('password' in changed.secrets, false);
  assert.throws(() => contract.providerPatch('SMTP', { ...config, host: 'smtp.gmail.com' }, {}, 'SANDBOX'), /OAuth/);
});
test('providers show real pending/connected/failed states and unavailable Gmail/Push', () => {
  const { ProviderCards } = load('components/communication-providers.tsx');
  const html = renderToStaticMarkup(React.createElement(ProviderCards, { providers: [provider(), provider('META', { status: 'CONNECTED' }), provider('EVOLUTION', { status: 'FAILED' }), provider('GMAIL', { adapterAvailable: false }), provider('PUSH_PENDING', { adapterAvailable: false })], select() {} }));
  assert.match(html, /Validação pendente/); assert.match(html, /Conectado/); assert.match(html, /Falha/); assert.match(html, /OAuth ainda não configurado/); assert.equal((html.match(/>Configurar</g) ?? []).length, 3);
  assert.match(contract.providerState(), /não retornado/);
});
test('SMTP editor starts secrets empty, submits replacement once and clears after failed save', async () => {
  const calls = []; let resolve; const gate = new Promise(done => { resolve = done; });
  const row = provider();
  const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'SMTP', initial: row, close() {} }, { '@/lib/communication': { ...contract, communication: { patchProvider: async (name, body) => { calls.push([name, body]); await gate; throw new Error('Confira os campos informados e tente novamente.'); }, providers: async () => [row] } } });
  assert.equal(labelInput(h.render(), 'Nova senha SMTP').props.value, undefined);
  const input = { value: 'replacement-test-only' }; const domForm = { elements: { namedItem: () => input } };
  labelInput(h.render(), 'Nova senha SMTP').props.onChange({ currentTarget: { form: domForm } });
  const tree = h.render(); const form = nodes(tree, n => n.type === 'form')[0];
  form.props.onSubmit({ preventDefault() {}, currentTarget: domForm }); form.props.onSubmit({ preventDefault() {}, currentTarget: domForm });
  assert.equal(calls.length, 1); assert.equal(calls[0][1].secrets.password, 'replacement-test-only'); assert.equal(input.value, ''); assert.doesNotMatch(JSON.stringify(h.states), /replacement-test-only/);
  resolve(); await tick(); assert.equal(labelInput(h.render(), 'Nova senha SMTP').props.value, undefined); assert.match(h.html(), /Confira os campos/); assert.doesNotMatch(h.html(), /replacement-test-only/);
});
test('SMTP test does not imply sent or delivered and enabling requires CONNECTED', async () => {
  const row = provider(); const calls = [];
  const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'SMTP', initial: row, close() {} }, { '@/lib/communication': { ...contract, communication: { test: async () => { calls.push('test'); return { connected: true, sendTested: false }; }, providers: async () => [provider('SMTP', { status: 'CONNECTED' })], sendTest: async () => ({ accepted: true, delivered: false }) } } });
  assert.equal(nodes(h.render(), n => n.type === 'button' && n.props.children === 'Habilitar canal')[0].props.disabled, true);
  click(h.render(), 'Testar conexão'); await tick(); assert.deepEqual(calls, ['test']); assert.match(h.html(), /não comprova entrega/);
  assert.equal(nodes(h.render(), n => n.type === 'button' && n.props.children === 'Habilitar canal')[0].props.disabled, false);
  click(h.render(), 'Enviar teste para mim'); await tick(); assert.match(h.html(), /Entrega não confirmada/);
});
test('Meta editor has only write-only secrets and sends approved static reference', async () => {
  const row = provider('META', { config: { phoneNumberId: '123', businessAccountId: '456', graphVersion: 'v25.0' } });
  const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'META', initial: row, close() {} }, { './communication-resource': resourceMock([]) });
  for (const label of ['Novo access token', 'Novo app secret', 'Novo verify token']) assert.equal(labelInput(h.render(), label).props.value, undefined);
  assert.equal(nodes(h.render(), n => n.type === 'button' && n.props.children === 'Enviar teste para mim')[0].props.disabled, true);
  const picker = nodes(h.render(), n => typeof n.type === 'function' && n.type.name === 'MetaTest')[0];
  picker.props.choose({ externalId: '789', name: 'hello', language: 'pt_BR' });
  assert.equal(nodes(h.render(), n => n.type === 'button' && n.props.children === 'Enviar teste para mim')[0].props.disabled, false);
});
test('Evolution pairs with real backend PNG only; invalid data never renders', async () => {
  for (const qr of ['data:image/png;base64,iVBORw0KGgo=', 'https://untrusted.test/qr', 'data:image/svg+xml;base64,AAAA']) {
    const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'EVOLUTION', initial: provider('EVOLUTION'), close() {} }, { '@/lib/communication': { ...contract, communication: { pair: async () => ({ connected: false, qrCode: qr }), providers: async () => [provider('EVOLUTION')] } } });
    click(h.render(), 'Parear / atualizar QR Code'); await tick(); const images = nodes(h.render(), n => n.type === 'img');
    assert.equal(images.length, qr.startsWith('data:image/png') ? 1 : 0);
    if (images.length) { assert.equal(images[0].props.src, qr); click(h.render(), 'Ocultar QR Code'); assert.equal(nodes(h.render(), n => n.type === 'img').length, 0); }
    else assert.match(h.html(), /QR Code inválido/);
  }
});
test('internal template validates event variables, persists exact text contract and escapes preview', async () => {
  const calls = [];
  const h = harness('components/communication-templates.tsx', 'InternalTemplateEditor', { event: { event: 'TRIAL_STARTED', variables: ['nome'] }, channel: 'EMAIL', providers: [provider()], saved() {} }, { '@/lib/communication': { ...contract, communication: { saveTemplate: async (...args) => { calls.push(args); return {}; } } } });
  labelInput(h.render(), 'Assunto').props.onChange({ target: { value: 'Olá {{nome}}' } });
  labelInput(h.render(), 'Conteúdo em texto').props.onChange({ target: { value: '<img src=x onerror=alert(1)> {{nome}}' } });
  assert.match(h.html(), /&lt;img/); assert.doesNotMatch(h.html(), /<img/); assert.match(h.html(), /\[nome\]/);
  await h.render().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ['TRIAL_STARTED', 'EMAIL', { provider: 'SMTP', enabled: false, content: { subject: 'Olá {{nome}}', text: '<img src=x onerror=alert(1)> {{nome}}' } }]);
  labelInput(h.render(), 'Conteúdo em texto').props.onChange({ target: { value: '{{token}}' } }); await h.render().props.onSubmit({ preventDefault() {} }); assert.equal(calls.length, 1); assert.match(h.html(), /Use apenas as variáveis/);
});
test('internal Meta persisted content converts to exact reference contract', async () => {
  const calls = [];
  const initial = { provider: 'META', enabled: false, content: { text: '', metaId: '123', metaName: 'hello', metaLanguage: 'pt_BR', metaParameters: '["nome"]' } };
  const h = harness('components/communication-templates.tsx', 'InternalTemplateEditor', { event: { event: 'OWNER_WELCOME', variables: ['nome'] }, channel: 'WHATSAPP', providers: [provider('META')], initial, saved() {} }, { './communication-resource': resourceMock([]), '@/lib/communication': { ...contract, communication: { saveTemplate: async (...args) => { calls.push(args); return {}; } } } });
  await h.render().props.onSubmit({ preventDefault() {} }); assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2].content)), { id: '123', name: 'hello', language: 'pt_BR', parameters: ['nome'] });
});
test('Gmail and Push templates cannot activate an unavailable provider', () => {
  const h = harness('components/communication-templates.tsx', 'InternalTemplateEditor', { event: { event: 'OWNER_WELCOME', variables: ['nome'] }, channel: 'PUSH', providers: [provider('PUSH_PENDING', { adapterAvailable: false })], saved() {} });
  const checkbox = nodes(h.render(), n => n.type === 'input' && n.props.type === 'checkbox')[0]; assert.equal(checkbox.props.disabled, true); assert.equal(checkbox.props.checked, false);
});
test('events come from API and templates handle an empty event catalog', () => {
  for (const data of [[], [{ event: 'FUTURE_BACKEND_EVENT', variables: ['nome'] }]]) {
    const h = harness('components/communication-templates.tsx', 'CommunicationEvents', {}, { './communication-resource': resourceMock(data) });
    assert.match(h.html(), data.length ? /FUTURE_BACKEND_EVENT/ : /Nenhum evento/);
  }
  const h = harness('components/communication-templates.tsx', 'CommunicationTemplates', {}, { './communication-resource': resourceMock({ events: [], templates: [], providers: [] }) }); assert.match(h.html(), /Nenhum evento/);
});
test('Meta creation submits static UTILITY then requires sync; sync cursor uses response', async () => {
  const calls = []; const templates = [{ id: 'id', externalId: '123', name: 'hello', language: 'pt_BR', category: 'UTILITY', status: 'PENDING', components: [{ type: 'BODY', text: 'Olá' }], syncedAt: null }];
  const h = harness('components/communication-meta.tsx', 'CommunicationMeta', {}, { './communication-resource': resourceMock(templates), '@/lib/communication': { ...contract, communication: { createMeta: async body => { calls.push(body); return { externalId: '123', syncRequired: true }; }, syncMeta: async after => { calls.push(after); return { synced: 1, after: after ? null : 'next-page' }; } } } });
  labelInput(h.render(), 'Nome').props.onChange({ target: { value: 'hello' } }); labelInput(h.render(), 'Idioma (ex.: pt_BR)').props.onChange({ target: { value: 'pt_BR' } }); labelInput(h.render(), 'Corpo estático').props.onChange({ target: { value: 'Olá' } });
  const form = nodes(h.render(), n => n.type === 'form')[0]; await form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { name: 'hello', language: 'pt_BR', category: 'UTILITY', text: 'Olá' });
  assert.match(h.html(), /Sincronize para consultar/); assert.doesNotMatch(h.html(), />Aprovado</);
  assert.equal(nodes(h.render(), n => n.type === 'fieldset')[0].props.disabled, true);
  click(h.render(), 'Sincronizar desde o início'); await tick(); click(h.render(), 'Sincronizar próxima página'); await tick(); assert.equal(calls[2], 'next-page');
});
test('reprocess confirms before execution, prevents double click and never offers UNCERTAIN retry', async () => {
  const row = { id: 'id', status: 'RETRY', attempts: 1 }; let confirm = false; let calls = 0; let refreshes = 0; let done;
  const h = harness('components/communication-records.tsx', 'ReprocessAction', { row, refreshed: async () => { refreshes++; } }, { '@/lib/communication': { ...contract, communication: { reprocess: async () => { calls++; await new Promise(resolve => { done = resolve; }); return { queued: true }; } } } }, { window: { confirm: () => confirm } });
  click(h.render(), 'Reprocessar'); assert.equal(calls, 0); confirm = true;
  click(h.render(), 'Reprocessar'); click(h.render(), 'Reprocessar'); assert.equal(calls, 1); done(); await tick(); assert.equal(refreshes, 1); assert.match(h.html(), /Nova tentativa solicitada/);
  for (const status of ['UNCERTAIN', 'FAILED', 'ACCEPTED', 'DELIVERED']) assert.equal(contract.canReprocess({ ...row, status }), false);
  assert.equal(contract.canReprocess({ ...row, attempts: 5 }), false);
});
test('outbox, deliveries, failures and logs render empty and real records without sensitive payloads', () => {
  const cases = [
    ['CommunicationOutbox', {}, { id: 'outbox', event: 'TRIAL_STARTED', expandedAt: null, lastError: null, createdAt: null, variables: { secret: 'hidden-value' }, businessKey: 'hidden-value' }, /TRIAL_STARTED/],
    ['CommunicationDeliveries', {}, { id: 'id', outboxId: 'outbox', channel: 'WHATSAPP', provider: 'EVOLUTION', environment: 'SANDBOX', status: 'ACCEPTED', attempts: 1, recipientMasked: '+55***99', createdAt: null, nextAttemptAt: null, lastError: null, payloadEncrypted: 'hidden-value' }, /Aceito pelo provedor/],
    ['CommunicationDeliveries', { failures: true }, { id: 'id', outboxId: 'outbox', channel: 'EMAIL', provider: 'SMTP', environment: 'SANDBOX', status: 'UNCERTAIN', attempts: 1, recipientMasked: 'o***@example.test', createdAt: null, lastError: 'WORKER_INTERRUPTED', payloadEncrypted: 'hidden-value' }, /Resultado incerto/],
    ['CommunicationLogs', {}, { id: 'log', action: 'PROVIDER_TEST_SMTP', code: 'CONNECTION_FAILED', attempt: 1, createdAt: null, actorId: 'hidden-value' }, /CONNECTION_FAILED/],
  ];
  for (const [name, props, row, expected] of cases) {
    const h = harness('components/communication-records.tsx', name, props, { './communication-resource': resourceMock([row]) }); assert.match(h.html(), expected); assert.doesNotMatch(h.html(), /hidden-value/); assert.match(h.html(), /role="region"/);
    const empty = harness('components/communication-records.tsx', name, props, { './communication-resource': resourceMock([]) }); assert.match(empty.html(), /Nenhum/);
  }
});
test('shared communication resource handles loading, error, cancellation and retry', async () => {
  let state; const effects = []; let fail = false; const calls = [];
  const loader = async signal => { calls.push(signal); if (fail) throw new Error('Serviço indisponível.'); return ['global']; };
  function Probe() { state = mod.useCommunicationResource(loader); return null; }
  const states = []; const refs = []; let cursor = 0; let refCursor = 0;
  const mod = load('components/communication-resource.tsx', { react: { ...React, useCallback: fn => fn, useEffect: fn => effects.push(fn), useRef: value => refs[refCursor++] ??= { current: value }, useState(value) { const i = cursor++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = next; }]; } } });
  const render = () => { cursor = 0; refCursor = 0; Probe(); };
  render(); assert.equal(state.loading, true); const clean = effects[0](); await tick(); render(); assert.equal(state.data[0], 'global'); assert.equal(state.loading, false);
  fail = true; await state.load(); render(); assert.match(state.error, /Serviço indisponível/); assert.equal(state.data, null);
  fail = false; await state.load(); render(); assert.equal(state.error, ''); assert.equal(state.data[0], 'global'); clean(); assert.equal(calls.at(-1).aborted, true);
  const loadingHtml = renderToStaticMarkup(React.createElement(mod.ResourceState, { loading: true, error: '', retry() {} }, 'private')); assert.match(loadingHtml, /Carregando/); assert.doesNotMatch(loadingHtml, /private/);
  const errorHtml = renderToStaticMarkup(React.createElement(mod.ResourceState, { loading: false, error: 'Falha de rede.', retry() {} }, 'private')); assert.match(errorHtml, /role="alert"/); assert.match(errorHtml, /Tentar novamente/); assert.doesNotMatch(errorHtml, /private/);
});
test('communication route never mounts or loads its sections for non-Super Admin', () => {
  let mounted = 0;
  const child = () => { mounted++; return React.createElement('p', null, 'GLOBAL CONTENT'); };
  for (const state of [{ profile: null, loading: true }, { profile: null, loading: false }, { profile: { systemRole: 'USER' }, loading: false }, { profile: { systemRole: 'SUPER_ADMIN' }, loading: false }]) {
    const h = harness('components/communication-page.tsx', 'CommunicationContent', {}, { '@/components/auth-provider': { useAuth: () => state }, '@/components/admin-section': { AdminSection: ({ children }) => children }, '@/components/communication-overview': { CommunicationOverview: child } });
    const html = h.html(); assert.equal(html.includes('GLOBAL CONTENT'), state.profile?.systemRole === 'SUPER_ADMIN');
  }
  assert.equal(mounted, 1);
});
test('communication overview counts only returned samples and independent API failures stay visible', () => {
  const resource = { ...resourceMock([]), useCommunicationResource: loader => loader === contract.communication.providers ? fixture([provider(), provider('META', { status: 'CONNECTED' })]) : loader === contract.communication.outbox ? fixture([{ expandedAt: null }]) : loader === contract.communication.deliveries ? fixture([{ status: 'ACCEPTED' }, { status: 'RETRY' }]) : fixture(null, { error: 'Serviço indisponível.' }) };
  const h = harness('components/communication-overview.tsx', 'CommunicationOverview', {}, { '@/lib/communication': contract, './communication-resource': resource });
  const html = h.html(); assert.match(html, /não totais da plataforma/); assert.match(html, /2 entregas retornadas; 1/); assert.match(html, /Serviço indisponível/);
});
test('communication security and mobile layout: no secret persistence, unsafe HTML or unrestricted images', () => {
  const files = [...fs.readdirSync('components').filter(name => name.startsWith('communication-')).map(name => `components/${name}`), 'lib/communication.ts', 'app/super-admin/comunicacao/page.tsx'];
  const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\.|dangerouslySetInnerHTML|iframe|tenantApi|\/webhooks\/communication/);
  assert.doesNotMatch(source, /\[secrets, setSecrets\]|value=\{secrets/); assert.match(source, /input\.value = ""/); assert.match(source, /useCommunicationPending/);
  const css = fs.readFileSync('app/globals.css', 'utf8'); assert.match(css, /@media \(max-width: 760px\).*communication-form-grid \{ grid-template-columns: 1fr/); assert.match(css, /communication-page \.commercial-table-wrap \{ max-width: 100%/);
});

test('communication HTTP and network errors reuse sanitized API messages without leaking response details', async () => {
  for (const status of [401, 403, 404, 409, 422, 429, 500, 503, 0]) {
    const client = load('lib/api.ts', {}, {
      fetch: async () => { if (!status) throw new Error('private-token'); return new Response(JSON.stringify({ message: 'private-token' }), { status }); },
      navigator: { locks: { request: async (_name, fn) => fn() } },
    });
    await assert.rejects(client.api('/communication/providers'), error => error.status === status && !error.message.includes('private-token'));
  }
});
test('navigation stays blocked while mutation is pending and asks before discarding drafts', () => {
  let allowed = false; let confirmations = 0;
  const auth = { useAuth: () => ({ loading: false, profile: { systemRole: 'SUPER_ADMIN' } }) };
  const mocks = { '@/components/auth-provider': auth, '@/components/admin-section': { AdminSection: ({ children }) => children }, '@/components/communication-operations': { CommunicationOperations: ({ children }) => children, useCommunicationPending: () => true } };
  const busy = harness('components/communication-page.tsx', 'CommunicationContent', {}, mocks);
  const buttons = nodes(busy.render(), node => node.type === 'button'); assert.ok(buttons.every(button => button.props.disabled));
  click(busy.render(), 'Canais'); assert.equal(busy.states[0], 'overview');
  const h = harness('components/communication-page.tsx', 'CommunicationContent', {}, { ...mocks, '@/components/communication-operations': { ...mocks['@/components/communication-operations'], useCommunicationPending: () => false } }, { window: { confirm: () => { confirmations++; return allowed; } } });
  nodes(h.render(), node => node.type === 'section')[0].props.onChangeCapture({ target: { closest: () => ({}) } });
  click(h.render(), 'Canais'); assert.equal(h.states[0], 'overview'); allowed = true; click(h.render(), 'Canais'); assert.equal(h.states[0], 'providers'); assert.equal(confirmations, 2);
});

test('Evolution already-connected response requires no QR and never marks delivery or provider validated', async () => {
  const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'EVOLUTION', initial: provider('EVOLUTION'), close() {} }, { '@/lib/communication': { ...contract, communication: { pair: async () => ({ connected: true }), providers: async () => [provider('EVOLUTION')] } } });
  click(h.render(), 'Parear / atualizar QR Code'); await tick();
  assert.equal(nodes(h.render(), node => node.type === 'img').length, 0);
  assert.match(h.html(), /instância já está conectada/); assert.match(h.html(), /Validação pendente/); assert.doesNotMatch(h.html(), /QR Code inválido|Cannot read|Entregue/);
  assert.equal(contract.safeQr(undefined), null);
});
test('all provider secrets stay out of React state and clear before the asynchronous request', async () => {
  for (const name of ['SMTP', 'META', 'EVOLUTION']) {
    const row = provider(name); const calls = [];
    const fields = Object.fromEntries(contract.secretFields[name].map(([key]) => [key, { value: `private-test-${key}` }]));
    const domForm = { elements: { namedItem: key => fields[key] } };
    const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name, initial: row, close() {} }, { './communication-resource': resourceMock([]), '@/lib/communication': { ...contract, communication: { providers: async () => [row], patchProvider: async (_name, body) => { calls.push(body); assert.ok(Object.values(fields).every(input => input.value === '')); return row; } } } });
    const [key, label] = contract.secretFields[name][0];
    const element = labelInput(h.render(), label); assert.equal(element.props.value, undefined); assert.equal(element.props.defaultValue, undefined);
    element.props.onChange({ currentTarget: { form: domForm } });
    assert.doesNotMatch(JSON.stringify(h.states), /private-test-/);
    nodes(h.render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: domForm }); await tick();
    assert.equal(calls[0].secrets[key], `private-test-${key}`); assert.doesNotMatch(JSON.stringify(h.states), /private-test-/); assert.doesNotMatch(h.html(), /private-test-/);
  }
});
test('Meta retry guard survives remount and only clears after all sync pages and a successful list reload', async () => {
  let guard = false; let next = 'next-page'; let loaded = true; let creates = 0;
  const mocks = {
    __context: () => ({ pending: 0, change() {}, metaSyncNeeded: guard, setMetaSyncNeeded: value => { guard = value; } }),
    './communication-resource': { ...resourceMock([]), useCommunicationResource: () => fixture([], { load: async () => loaded }) },
    '@/lib/communication': { ...contract, communication: { createMeta: async () => { creates++; throw new Error('Serviço indisponível.'); }, syncMeta: async () => ({ synced: 1, after: next }) } },
  };
  let h = harness('components/communication-meta.tsx', 'CommunicationMeta', {}, mocks);
  await nodes(h.render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); assert.equal(creates, 1); assert.equal(guard, true);
  h = harness('components/communication-meta.tsx', 'CommunicationMeta', {}, mocks); // Return to Meta section.
  await nodes(h.render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); assert.equal(creates, 1);
  click(h.render(), 'Sincronizar desde o início'); await tick(); assert.equal(guard, true);
  next = null; loaded = false; click(h.render(), 'Sincronizar próxima página'); await tick(); assert.equal(guard, true);
  loaded = true; click(h.render(), 'Sincronizar desde o início'); await tick(); assert.equal(guard, false);
});
test('resource retry inside a form is explicitly a non-submit button', () => {
  const { ResourceState } = load('components/communication-resource.tsx'); let retries = 0;
  const tree = ResourceState({ loading: false, error: 'Serviço indisponível.', retry: () => { retries++; }, children: null });
  const button = nodes(tree, node => node.type === 'button')[0]; assert.equal(button.props.type, 'button'); button.props.onClick(); assert.equal(retries, 1);
});
const backendRoot = path.resolve('../kalend-api/src');
test('frontend provider/template payloads execute the real local backend validators, including optional replyTo', { skip: !fs.existsSync(path.join(backendRoot, 'communication/configuration.ts')) }, () => {
  // Mock only DI/network infrastructure: actual configuration, template and common validators execute.
  const decorator = () => () => {};
  const nest = { BadRequestException: Error, ConflictException: Error, ServiceUnavailableException: Error, Inject: decorator, Injectable: decorator };
  const mocks = { '@nestjs/common': nest, '../prisma/prisma.service.js': {}, '../billing/secret-vault.js': {}, './transports.js': {}, './push.js': { validateVapid() { throw new Error('Push outside this SMTP/Meta fixture'); } }, './network.js': { allowedHost() {} } };
  const globals = { process: { env: { COMMUNICATION_META_GRAPH_VERSION: 'v25.0' } } };
  const backendConfig = load(path.join(backendRoot, 'communication/configuration.ts'), mocks, globals);
  const backendContracts = load(path.join(backendRoot, 'communication/contracts.ts'), mocks, globals);
  const configs = { SMTP: { ...provider().config, replyTo: '' }, META: { phoneNumberId: '123', businessAccountId: '456', graphVersion: 'v25.0' }, EVOLUTION: { baseUrl: 'https://evo.example.test', instance: 'kalend', version: '2.3.7' } };
  for (const name of Object.keys(configs)) {
    const body = contract.providerPatch(name, configs[name], {}, 'SANDBOX');
    assert.doesNotThrow(() => backendConfig.validateConfig(name, body.config));
    if (name === 'SMTP') { assert.equal('replyTo' in body.config, false); assert.throws(() => backendConfig.validateConfig(name, { ...body.config, replyTo: '' })); }
  }
  assert.doesNotThrow(() => backendConfig.validateConfig('SMTP', contract.providerPatch('SMTP', { ...configs.SMTP, replyTo: 'support@example.test' }, {}, 'SANDBOX').config));
  const events = backendContracts.EVENTS.map(event => ({ event, variables: backendContracts.variablesFor(event) }));
  for (const event of events) {
    const text = event.variables.map(key => `{{${key}}}`).join(' ');
    assert.doesNotThrow(() => backendContracts.templateContent({ subject: 'Kalend', text }, 'EMAIL', event.event, 'SMTP'));
    assert.doesNotThrow(() => backendContracts.templateContent({ id: '123', name: 'hello', language: 'pt_BR', parameters: event.variables }, 'WHATSAPP', event.event, 'META'));
  }
});
test('real Evolution transport response variants are consumed by the frontend pairing handler', { skip: !fs.existsSync(path.join(backendRoot, 'communication/transports.ts')) }, async () => {
  let remote;
  const mocks = { '@nestjs/common': { Injectable: () => () => {}, Inject: () => () => {}, BadRequestException: Error }, './gmail.js': { GmailTransport: class {} }, './push.js': { GlobalPush: class {} }, nodemailer: {}, './meta.js': { MetaTransport: class {} }, './network.js': { allowedHost() {}, jsonRequest: async () => remote } };
  const backend = load(path.join(backendRoot, 'communication/transports.ts'), mocks);
  for (const value of [{ instance: { state: 'open' } }, { qrcode: { base64: 'data:image/png;base64,iVBORw0KGgo=' } }]) {
    remote = value;
    const transport = new backend.EvolutionTransport();
    const result = await transport.pair({ baseUrl: 'https://evo.example.test', instance: 'kalend' }, { apiKey: 'test-only' });
    const h = harness('components/communication-providers.tsx', 'ProviderEditor', { name: 'EVOLUTION', initial: provider('EVOLUTION'), close() {} }, { '@/lib/communication': { ...contract, communication: { pair: async () => result, providers: async () => [provider('EVOLUTION')] } } });
    click(h.render(), 'Parear / atualizar QR Code'); await tick();
    assert.equal(nodes(h.render(), node => node.type === 'img').length, result.connected ? 0 : 1); assert.doesNotMatch(h.html(), /QR Code inválido|Cannot read/);
  }
});
