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
  return { render, states, refs, html: () => renderToStaticMarkup(render()) };
}
const row = (extra = {}) => ({ scope: 'COMPANY', configured: true, provider: 'GOOGLE', email: 'sender@gmail.com', username: 'sender@gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: 587, security: 'TLS', enabled: false, verified: false, status: 'UNTESTED', lastTestAt: null, lastTestRecipient: null, lastTestStatus: null, ...extra });
const contract = load('lib/email.ts', { './api': { api() {}, jsonBody: body => ({ body: JSON.stringify(body) }) } });
const find = (h, text) => nodes(h.render(), n => typeof n.type === 'function' && n.props.children === text)[0];
const click = (h, text) => find(h, text).props.onClick();
function input(h, label) { const node = nodes(h.render(), n => n.type === 'label' && React.Children.toArray(n.props.children)[0] === label)[0]; return nodes(node, n => n.type === 'input' || n.type === 'select')[0]; }
function editor(extra = {}, api = {}) {
  return harness('components/email-settings.tsx', 'EmailEditor', { context: { scope: 'COMPANY', companyId: 'a', userId: 'user' }, initial: row(extra) }, { '@/lib/email': { ...contract, emailApi: { save: async (_scope, body) => row(body), remove: async () => row({ configured: false, status: 'NOT_CONFIGURED' }), test: async (_scope, recipient) => ({ sent: true, message: 'E-mail enviado com sucesso!', recipient, server: 'smtp.gmail.com:587', tls: true, configuration: row({ verified: true, status: 'VERIFIED', lastTestAt: '2026-10-05T12:00:00Z', lastTestRecipient: recipient }) }), ...api } } });
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('SMTP client contracts use exact isolated routes and never send scope or companyId in a body', async () => {
  const calls = [];
  const client = load('lib/email.ts', { './api': { api: async (url, init) => { calls.push([url, init?.method ?? 'GET', init?.body ? JSON.parse(init.body) : undefined]); return {}; }, tenantApi: async (companyId, url, init, userId) => { assert.equal(companyId, 'a'); assert.equal(userId, 'user'); calls.push([url, init?.method ?? 'GET', init?.body ? JSON.parse(init.body) : undefined]); return {}; }, jsonBody: body => ({ body: JSON.stringify(body) }) } });
  for (const scope of ['SYSTEM', 'COMPANY']) { const context = scope === 'SYSTEM' ? { scope } : { scope, companyId: 'a', userId: 'user' }; await client.emailApi.get(context); await client.emailApi.save(context, { provider: 'GOOGLE', email: 'test@gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: 587, security: 'TLS', password: 'test-only' }); await client.emailApi.test(context, 'test@example.test'); await client.emailApi.remove(context); }
  assert.deepEqual(calls.map(c => c[0]), ['/communication/email', '/communication/email', '/communication/email/test', '/communication/email', '/company/communication/email', '/company/communication/email', '/company/communication/email/test', '/company/communication/email']);
  assert.deepEqual(calls.map(c => c[1]), ['GET', 'PUT', 'POST', 'DELETE', 'GET', 'PUT', 'POST', 'DELETE']);
  assert.deepEqual(calls[2][2], { recipient: 'test@example.test' });
  assert.ok(calls.every(c => !c[0].includes('password') && !c[2]?.companyId && !c[2]?.scope));
});
test('Gerenciar opens providers and existing configuration with an empty password', () => {
  const h = editor(); assert.equal(nodes(h.render(), n => n.type === 'input').length, 0); click(h, 'Gerenciar');
  assert.equal(input(h, 'E-mail').props.value, 'sender@gmail.com');
  assert.equal(input(h, 'Senha de app').props.type, 'password'); assert.equal(input(h, 'Senha de app').props.value, undefined); assert.equal(input(h, 'Senha de app').props.defaultValue, undefined);
  assert.match(h.html(), /Configurado, não testado/);
});
for (const [provider, preset] of Object.entries(contract.emailProviders)) test(`select ${provider} applies centralized SMTP defaults and manual changes`, () => {
  const h = editor(); click(h, 'Gerenciar'); click(h, preset.name);
  assert.equal(input(h, 'Servidor SMTP').props.value, preset.host); assert.equal(input(h, 'Porta').props.value, 587); assert.equal(input(h, 'Segurança').props.value, 'TLS');
  input(h, 'Servidor SMTP').props.onChange({ target: { value: 'smtp.custom.test' } }); assert.equal(input(h, 'Servidor SMTP').props.value, 'smtp.custom.test');
  input(h, 'Segurança').props.onChange({ target: { value: 'SSL' } }); assert.equal(input(h, 'Porta').props.value, 465);
});
test('Gmail has the exact app-password instructions and safe new-tab link below the password', () => {
  const h = editor(); click(h, 'Gerenciar');
  const html = h.html(); assert.match(html, /No Gmail, ative a verificação em duas etapas, gere uma senha de app/);
  assert.match(html, /e cole os 16 caracteres neste campo. Use smtp.gmail.com, porta 587 e segurança TLS./);
  const link = nodes(h.render(), n => n.type === 'a')[0]; assert.equal(link.props.href, 'https://myaccount.google.com/apppasswords'); assert.equal(link.props.children, 'aqui'); assert.equal(link.props.target, '_blank'); assert.equal(link.props.rel, 'noopener noreferrer');
  assert.doesNotMatch(html, /OAuth|Graph|Gmail API/);
});
test('save collects the password once, clears before request, blocks duplicates and waits for API confirmation', async () => {
  let resolve; const gate = new Promise(done => { resolve = done; }); const calls = [];
  const h = editor({ configured: false, status: 'NOT_CONFIGURED' }, { save: async (scope, body) => { calls.push([scope, body]); await gate; return row(); } }); click(h, 'Gerenciar');
  input(h, 'E-mail').props.onChange({ target: { value: 'new@gmail.com' } });
  input(h, 'Senha de app').props.ref.current = { value: 'private-app-password' };
  const form = nodes(h.render(), n => n.type === 'form')[0]; form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1); assert.equal(calls[0][1].password, 'private-app-password'); assert.equal(input(h, 'Senha de app').props.ref.current.value, '');
  assert.match(h.html(), /Não configurado/); assert.match(h.html(), /Salvando/); assert.doesNotMatch(JSON.stringify(h.states), /private-app-password/);
  resolve(); await tick(); assert.match(h.html(), /Salvo com sucesso/); assert.match(h.html(), /Configurado, não testado/);
});
test('existing password is omitted on update; failed saves stay unconfirmed and sanitize errors', async () => {
  const calls = []; const h = editor({}, { save: async (_scope, body) => { calls.push(body); throw new Error('password=private internal'); } }); click(h, 'Gerenciar');
  input(h, 'Porta').props.onChange({ target: { value: '465' } }); nodes(h.render(), n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await tick();
  assert.equal('password' in calls[0], false); assert.match(h.html(), /Não foi possível salvar/); assert.doesNotMatch(h.html(), /private internal|Salvo com sucesso/);
});
test('real test UI shows testing, returned recipient/server/TLS and last-test metadata', async () => {
  let resolve; const gate = new Promise(done => { resolve = done; });
  const h = editor({}, { test: async (scope, recipient) => { assert.equal(scope.scope, 'COMPANY'); assert.equal(scope.companyId, 'a'); assert.equal(recipient, 'recipient@example.test'); await gate; return { sent: true, recipient, server: 'smtp.gmail.com:587', tls: true, message: 'E-mail enviado com sucesso!', configuration: row({ status: 'VERIFIED', verified: true, lastTestAt: '2026-10-05T12:00:00Z', lastTestRecipient: recipient }) }; } }); click(h, 'Gerenciar');
  input(h, 'E-mail para teste').props.onChange({ target: { value: 'recipient@example.test' } }); nodes(h.render(), n => n.type === 'form')[1].props.onSubmit({ preventDefault() {} });
  assert.match(h.html(), /Testando/); assert.equal(find(h, 'Enviar e-mail de teste').props.disabled, true);
  resolve(); await tick(); assert.match(h.html(), /E-mail enviado com sucesso/); assert.match(h.html(), /recipient@example.test/); assert.match(h.html(), /smtp.gmail.com:587/); assert.match(h.html(), /TLS: Ativo/); assert.match(h.html(), /Último teste/); assert.equal(find(h, 'Habilitar envio').props.disabled, false);
});
test('SMTP rejection and HTTP/rate-limit failure show safe errors', async () => {
  for (const fails of [false, true]) {
    const h = editor({}, { test: async () => { if (fails) throw new Error('private'); return { sent: false, message: 'Não foi possível enviar o e-mail.', configuration: row({ status: 'ERROR' }) }; } }); click(h, 'Gerenciar');
    nodes(h.render(), n => n.type === 'form')[1].props.onSubmit({ preventDefault() {} }); await tick(); assert.match(h.html(), /Não foi possível enviar o e-mail/); assert.doesNotMatch(h.html(), /private|E-mail enviado com sucesso/);
  }
});
test('unsaved changes block tests; remove clears only after confirmation; disable uses verified existing configuration', async () => {
  const h = editor({ verified: true, status: 'VERIFIED', enabled: true }); click(h, 'Gerenciar');
  input(h, 'E-mail').props.onChange({ target: { value: 'changed@example.test' } }); assert.equal(find(h, 'Enviar e-mail de teste').props.disabled, true);
  click(h, 'Remover configuração'); await tick(); assert.match(h.html(), /Configuração removida/); assert.match(h.html(), /Não configurado/);
  const calls = []; const active = editor({ enabled: true, verified: true }, { save: async (_scope, body) => { calls.push(body); return row({ enabled: false }); } }); click(active, 'Gerenciar'); click(active, 'Desativar envio'); await tick(); assert.equal(calls[0].enabled, false); assert.equal('password' in calls[0], false);
});
test('scope authorization prevents global and tenant loaders mounting for unauthorized users', () => {
  for (const role of ['OWNER', 'ADMIN', 'PROFESSIONAL', 'CLIENT', 'RECEPTIONIST', 'SUPER_ADMIN']) for (const scope of ['SYSTEM', 'COMPANY']) {
    const profile = { user: { id: 'user' }, systemRole: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER', selectedCompanyId: 'a', memberships: [{ role, company: { id: 'a' } }] };
    const h = harness('components/email-settings.tsx', 'EmailSettings', { scope }, { '@/components/auth-provider': { useAuth: () => ({ profile, loading: false }) } });
    const tree = h.render(); const authorized = scope === 'SYSTEM' ? role === 'SUPER_ADMIN' : ['OWNER', 'ADMIN'].includes(role);
    assert.equal(typeof tree.type === 'function', authorized);
  }
  const h = harness('components/email-settings.tsx', 'EmailSettings', { scope: 'SYSTEM' }, { '@/components/auth-provider': { useAuth: () => ({ loading: true, profile: null }) } }); assert.match(h.html(), /Verificando sessão/);
});
test('loading and read failures use the existing resource UI without prematurely reporting configured', () => {
  for (const state of [{ loading: true, error: '' }, { loading: false, error: 'Não foi possível carregar' }]) {
    const h = harness('components/email-settings.tsx', 'EmailResource', { context: { scope: 'SYSTEM' } }, { react: { ...React, useCallback: fn => fn }, './communication-resource': { useCommunicationResource: () => ({ ...state, data: null, load() {} }), ResourceState: ({ loading, error }) => React.createElement('p', null, loading ? 'Carregando configuração' : error) } });
    assert.match(h.html(), state.loading ? /Carregando/ : /Não foi possível carregar/); assert.doesNotMatch(h.html(), /Configurado, não testado/);
  }
});
test('Web provider forms execute the actual API validator for all providers and TLS/SSL', () => {
  const decorator = () => () => {};
  const mocks = { '@nestjs/common': { BadRequestException: Error, ConflictException: Error, ServiceUnavailableException: Error, Injectable: decorator, Inject: decorator }, '../prisma/prisma.service.js': {}, '../billing/secret-vault.js': {}, './transports.js': {}, './push.js': { validateVapid() {} }, './network.js': { allowedHost() {} } };
  const backend = load('../kalend-api/src/communication/email.ts', mocks);
  for (const [provider, preset] of Object.entries(contract.emailProviders)) for (const security of ['TLS', 'SSL']) {
    const payload = { provider, email: 'test@example.test', smtpHost: preset.host || 'smtp.custom.test', smtpPort: security === 'SSL' ? 465 : preset.port, security, password: 'test-only' };
    const validated = backend.emailInput(payload); assert.equal(validated.config.host, payload.smtpHost); assert.equal(validated.config.secure, String(security === 'SSL')); assert.equal(validated.config.fromEmail, payload.email);
  }
});
test('SMTP UI never persists or logs secrets, requires password inputs and follows current theme', () => {
  const source = fs.readFileSync('components/email-settings.tsx', 'utf8') + fs.readFileSync('lib/email.ts', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\.|analytics|dangerouslySetInnerHTML/); assert.match(source, /type="password"/); assert.doesNotMatch(source, /useState.*password/);
  const css = fs.readFileSync('app/globals.css', 'utf8'); assert.match(css, /email-settings input.*var\(--kalend-surface\)/); assert.match(css, /email-form-grid \{ grid-template-columns: 1fr/);
});

function lockedEmailClients() {
  const queues = new Map(); const calls = []; const events = [];
  let identity = { selectedCompanyId: 'a', user: { id: 'user' } };
  let pause;
  const locks = { request(name, work) {
    const previous = queues.get(name) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(work); queues.set(name, next); return next;
  } };
  function tab() {
    const client = load('lib/api.ts', {}, {
      navigator: { locks }, window: { dispatchEvent: event => events.push(event.type) }, Event,
      fetch: async (url, init) => {
        const path = new URL(url).pathname;
        if (path === '/auth/me') return new Response(JSON.stringify(identity), { status: identity ? 200 : 401 });
        if (path === '/auth/logout') { identity = null; return new Response(null, { status: 204 }); }
        if (path === '/auth/login') { identity = { selectedCompanyId: 'a', user: { id: 'new-user' } }; return new Response('{}', { status: 200 }); }
        if (path === '/auth/refresh') return new Response('{}', { status: 401 });
        calls.push({ path, company: identity?.selectedCompanyId, user: identity?.user.id, method: init.method ?? 'GET' });
        if (pause) await pause;
        return new Response(JSON.stringify(row()), { status: 200 });
      },
    });
    return { session: client, email: load('lib/email.ts', { './api': client }).emailApi };
  }
  return { first: tab(), second: tab(), calls, events,
    select: company => locks.request('kalend-tenant-context', async () => { identity = { ...identity, selectedCompanyId: company }; }),
    pause: promise => { pause = promise; }, identity: () => identity,
  };
}
for (const [from, to] of [['a', 'b'], ['b', 'a']]) test(`SMTP stale ${from} context is rejected after a second tab selects ${to}`, async () => {
  const f = lockedEmailClients(); await f.select(from);
  const previous = { scope: 'COMPANY', companyId: from, userId: 'user' };
  await f.first.email.get(previous); await f.select(to); const before = f.calls.length;
  for (const operation of [() => f.first.email.get(previous), () => f.first.email.save(previous, {}), () => f.first.email.test(previous, 'test@example.test'), () => f.first.email.remove(previous)]) await assert.rejects(operation(), /empresa selecionada mudou/);
  assert.equal(f.calls.length, before); assert.ok(f.events.includes('kalend:tenant-changed'));
  await f.second.email.get({ ...previous, companyId: to }); assert.equal(f.calls.at(-1).company, to);
});
test('two tabs share the tenant lock through the complete SMTP request; selection waits', async () => {
  const f = lockedEmailClients(); let release; f.pause(new Promise(resolve => { release = resolve; }));
  const sending = f.first.email.test({ scope: 'COMPANY', companyId: 'a', userId: 'user' }, 'test@example.test');
  await tick(); const selecting = f.select('b'); await tick(); assert.equal(f.identity().selectedCompanyId, 'a');
  release(); await sending; await selecting; assert.equal(f.calls[0].company, 'a'); assert.equal(f.identity().selectedCompanyId, 'b');
});
test('logout/login invalidates an old SMTP editor even when the new account selects the same company', async () => {
  const f = lockedEmailClients(); const context = { scope: 'COMPANY', companyId: 'a', userId: 'user' };
  await f.first.email.get(context); await f.second.session.api('/auth/logout', { method: 'POST' });
  await assert.rejects(f.first.email.remove(context)); const before = f.calls.length;
  await f.second.session.api('/auth/login', { method: 'POST' }); f.second.session.sessionStarted();
  await assert.rejects(f.first.email.save(context, {}), /sessão mudou/); assert.equal(f.calls.length, before);
  await f.second.email.get({ ...context, userId: 'new-user' }); assert.equal(f.calls.at(-1).user, 'new-user');
});
test('invalid SMTP context fails before a request, and absent company selection fails before the SMTP endpoint', async () => {
  const f = lockedEmailClients();
  for (const context of [{ scope: 'COMPANY', companyId: '', userId: 'user' }, { scope: 'COMPANY', companyId: 'a', userId: '' }]) await assert.rejects(f.first.email.get(context), /válidas/);
  await f.select(null); await assert.rejects(f.first.email.get({ scope: 'COMPANY', companyId: 'a', userId: 'user' }), /empresa selecionada mudou/); assert.equal(f.calls.length, 0);
});
test('AuthProvider remounts the email resource for company/user changes and denies logout state', () => {
  let profile = { user: { id: 'user' }, systemRole: 'USER', selectedCompanyId: 'a', memberships: ['a', 'b'].map(id => ({ role: 'OWNER', company: { id } })) };
  const h = harness('components/email-settings.tsx', 'EmailSettings', { scope: 'COMPANY' }, { '@/components/auth-provider': { useAuth: () => ({ profile, loading: false }) } });
  const first = h.render(); assert.equal(first.props.context.companyId, 'a');
  profile = { ...profile, selectedCompanyId: 'b' }; const second = h.render(); assert.notEqual(first.key, second.key); assert.equal(second.props.context.companyId, 'b');
  profile = { ...profile, user: { id: 'new-user' } }; assert.notEqual(second.key, h.render().key);
  profile = null; assert.match(h.html(), /Acesso não autorizado/);
});
test('global SMTP UI save/test/enable preserves actual backend legacy fromName, replyTo and provider', async () => {
  const decorator = () => () => {};
  const mocks = { '@nestjs/common': { BadRequestException: Error, ConflictException: Error, ServiceUnavailableException: Error, Injectable: decorator, Inject: decorator }, '../prisma/prisma.service.js': {}, '../billing/secret-vault.js': {}, './transports.js': {}, './push.js': { validateVapid() {} }, './network.js': { allowedHost() {} } };
  const { EmailService } = load('../kalend-api/src/communication/email.ts', mocks);
  let stored = { environment: 'SANDBOX', enabled: false, revision: 1, credentialsEncrypted: 'encrypted-test-only', config: { host: 'smtp.gmail.com', port: '587', secure: 'false', username: 'sender@gmail.com', fromEmail: 'sender@gmail.com', fromName: 'Minha marca', replyTo: 'reply@example.test', emailProvider: 'GOOGLE' } };
  const db = { globalCommunicationProvider: { findUnique: async () => stored, upsert: async ({ update }) => { stored = { ...stored, ...update, revision: stored.revision + 1 }; }, updateMany: async ({ data }) => { stored = { ...stored, ...data }; return { count: 1 }; } }, $transaction: fn => fn(db) };
  const service = new EmailService(db, { encrypt: () => 'encrypted-test-only', decrypt: () => JSON.stringify({ password: 'test-only' }) }, { send: async config => { assert.equal(config.fromName, 'Minha marca'); assert.equal(config.replyTo, 'reply@example.test'); return 'id'; } });
  const h = harness('components/email-settings.tsx', 'EmailEditor', { context: { scope: 'SYSTEM' }, initial: await service.get({ scope: 'SYSTEM' }) }, { '@/lib/email': { ...contract, emailApi: { save: (ctx, body) => service.save(ctx, body), test: (ctx, recipient) => service.test(ctx, { recipient }) } } });
  click(h, 'Gerenciar'); nodes(h.render(), n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await tick();
  input(h, 'E-mail para teste').props.onChange({ target: { value: 'test@example.test' } }); nodes(h.render(), n => n.type === 'form')[1].props.onSubmit({ preventDefault() {} }); await tick();
  click(h, 'Habilitar envio'); await tick();
  assert.equal(stored.enabled, true); assert.equal(stored.config.fromName, 'Minha marca'); assert.equal(stored.config.replyTo, 'reply@example.test'); assert.equal(stored.config.emailProvider, 'GOOGLE'); assert.match(h.html(), /Testado com sucesso/);
});
