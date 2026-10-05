/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const browserNavigation = require('./helpers/browser-navigation.cjs');
const loader = require('./helpers/load-ts.cjs');
const initialBrowser = browserNavigation();
function expose(window) {
  for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'navigator']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? window : window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}
expose(initialBrowser.window);
const { createRoot } = require('react-dom/client');
initialBrowser.dom.window.close();
const savedRow = { scope: 'SYSTEM', configured: true, hasPassword: true, provider: 'GOOGLE', email: 'sender@gmail.com', username: 'sender@gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: 587, security: 'TLS', enabled: false, verified: false, status: 'UNTESTED', lastTestAt: null, lastTestRecipient: null, lastTestStatus: null };
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function fixture(t, { notification = false } = {}) {
  const browser = browserNavigation(); expose(browser.window);
  const container = document.getElementById('root'); const root = createRoot(container);
  const calls = []; let persisted = { ...savedRow }; let status = 200;
  const mockFetch = async (url, init = {}) => {
    const path = new URL(url).pathname; const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, method: init.method ?? 'GET', body });
    assert.equal(path, '/communication/email');
    if (init.method === 'PUT') {
      if (status !== 200) return new Response(JSON.stringify({ message: 'unsuitable internal details' }), { status });
      const publicFields = { ...body }; delete publicFields.password;
      persisted = { ...persisted, ...publicFields, hasPassword: true };
    }
    return new Response(JSON.stringify(persisted), { status: 200 });
  };
  const stub = () => null;
  const mocks = {
    'next/navigation': { useRouter: () => browser.router },
    '@/components/auth-provider': { useAuth: () => ({ loading: false, profile: { systemRole: 'SUPER_ADMIN', user: { id: 'super' }, memberships: [], selectedCompanyId: null } }) },
    '@/components/communication-overview': { CommunicationOverview: stub },
    '@/components/communication-providers': { CommunicationProviders: stub },
    '@/components/communication-templates': { CommunicationTemplates: stub, CommunicationEvents: stub },
    '@/components/communication-meta': { CommunicationMeta: stub },
    '@/components/communication-records': { CommunicationOutbox: stub, CommunicationDeliveries: stub, CommunicationLogs: stub },
  };
  const load = loader(mocks, { window, document, Element, navigator, fetch: mockFetch, BroadcastChannel: undefined,
    Event: browser.window.Event, CustomEvent: browser.window.CustomEvent });
  const { default: CommunicationPage } = load('components/communication-page.tsx');
  const { NotificationList } = load('components/notification-list.tsx');
  const guard = load('lib/email-leave-guard.ts'); const router = guard.guardEmailRouter(browser.router);
  const button = text => [...container.querySelectorAll('button')].find(button => button.textContent === text);
  const input = text => [...container.querySelectorAll('label')].find(label => label.firstChild.textContent === text)?.querySelector('input');
  const click = async text => { await React.act(async () => { assert.ok(button(text), `Missing button: ${text}`); button(text).click(); await tick(); }); };
  const change = async (label, value) => {
    await React.act(async () => {
      const field = input(label); assert.ok(field, `Missing field: ${label}`);
      Object.getOwnPropertyDescriptor(browser.window.HTMLInputElement.prototype, 'value').set.call(field, value);
      field.dispatchEvent(new browser.window.Event('input', { bubbles: true }));
    });
  };
  const submit = async () => { await React.act(async () => { container.querySelector('form').dispatchEvent(new browser.window.Event('submit', { bubbles: true, cancelable: true })); await tick(); }); };
  const unloadAllowed = () => browser.window.dispatchEvent(new browser.window.Event('beforeunload', { cancelable: true }));
  t.after(async () => { await React.act(async () => root.unmount()); assert.equal(browser.tracked.length, 0); browser.dom.window.close(); });
  await React.act(async () => { root.render(React.createElement(React.StrictMode, null, React.createElement(CommunicationPage), notification && React.createElement(NotificationList, { saving: false, read: async () => true, items: [{ id: 'fixture-notification', type: 'empresa', title: 'Fixture', message: 'Fixture', scope: 'GLOBAL', createdAt: '2026-10-05T12:00:00Z', readAt: '2026-10-05T12:00:00Z', actionUrl: '/conta', actionLabel: 'Abrir notificação' }] }))); });
  await click('E-mail'); await React.act(async () => { await tick(); }); await click('Gerenciar');
  assert.equal(input('Servidor SMTP').value, savedRow.smtpHost);
  return { ...browser, container, calls, router, button, input, click, change, submit, unloadAllowed, status(value) { status = value; } };
}

test('real React effects: GET → edit → PUT 200 → editor snapshot clean → CommunicationPage and leave guard allow navigation', async t => {
  const f = await fixture(t);
  assert.equal(f.unloadAllowed(), true);
  await f.change('Servidor SMTP', 'smtp.updated.test');
  assert.equal(f.unloadAllowed(), false);
  await f.click('Visão geral'); assert.ok(f.input('Servidor SMTP')); assert.equal(f.prompts.length, 1);
  f.prompts.length = 0;
  await f.submit();
  assert.equal(f.calls.at(-1).method, 'PUT'); assert.equal(f.calls.at(-1).body.smtpHost, 'smtp.updated.test');
  assert.equal(f.input('Servidor SMTP').value, 'smtp.updated.test');
  assert.match(f.container.textContent, /Configuração salva com sucesso\./);
  assert.doesNotMatch(f.container.textContent, /Salve as alterações/); assert.equal(f.unloadAllowed(), true);
  f.router.push('/conta'); assert.equal(f.prompts.length, 0); assert.equal(f.calls.filter(call => call.method === 'PUT').length, 1);
  await f.click('Visão geral'); assert.equal(f.prompts.length, 0); assert.equal(f.input('Servidor SMTP'), undefined);
  await f.click('E-mail'); await React.act(async () => { await tick(); }); await f.click('Gerenciar');
  assert.equal(f.calls.at(-1).method, 'GET'); assert.equal(f.input('Servidor SMTP').value, 'smtp.updated.test');
  assert.equal(f.unloadAllowed(), true);
});
for (const status of [400, 500]) test(`real React effects: PUT ${status} retains values, dirty state and both navigation guards`, async t => {
  const f = await fixture(t); f.status(status);
  await f.change('Servidor SMTP', 'smtp.unsaved.test'); await f.submit();
  assert.equal(f.input('Servidor SMTP').value, 'smtp.unsaved.test'); assert.equal(f.unloadAllowed(), false);
  assert.match(f.container.textContent, /Não foi possível salvar a configuração/);
  assert.doesNotMatch(f.container.textContent, /Configuração salva com sucesso|unsuitable internal details/);
  const before = f.snapshot(); f.router.replace('/conta'); assert.deepEqual(f.snapshot(), before);
  await f.click('Visão geral'); assert.ok(f.input('Servidor SMTP')); assert.equal(f.prompts.length, 2);
  f.status(200); await f.submit(); assert.equal(f.unloadAllowed(), true);
  await f.click('Visão geral'); assert.equal(f.prompts.length, 2);
});
test('mounted password input: visual placeholder stays out of PUT, replacement alone is sent and successful save restores clean mask', async t => {
  const f = await fixture(t); const field = f.input('Senha de app');
  assert.equal(field.placeholder, '••••••••••••'); assert.equal(field.value, '');
  await f.submit(); assert.equal(Object.hasOwn(f.calls.at(-1).body, 'password'), false); assert.equal(f.unloadAllowed(), true);
  await f.change('Senha de app', 'replacement-fixture-only'); assert.equal(f.unloadAllowed(), false);
  await f.submit(); assert.equal(f.calls.at(-1).body.password, 'replacement-fixture-only');
  assert.equal(f.input('Senha de app').value, ''); assert.equal(f.input('Senha de app').placeholder, '••••••••••••');
  assert.equal(f.unloadAllowed(), true); assert.doesNotMatch(f.container.textContent, /Salve as alterações/);
  f.router.push('/conta'); assert.equal(f.prompts.length, 0);
  await f.click('Visão geral'); assert.equal(f.prompts.length, 0);
});

test('mounted notification action uses guarded App Router before navigation; saving releases the same action', async t => {
  const f = await fixture(t, { notification: true });
  await f.change('Servidor SMTP', 'smtp.updated.test');
  const before = f.snapshot(); await f.click('Abrir notificação');
  assert.deepEqual(f.snapshot(), before); assert.equal(f.prompts.length, 1); assert.equal(f.calls.filter(call => call.method === 'PUT').length, 0);
  await f.submit(); await f.click('Abrir notificação');
  assert.equal(f.prompts.length, 1); assert.equal(f.snapshot().url, 'https://web.test/conta');
});
