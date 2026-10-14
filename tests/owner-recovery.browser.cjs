/* eslint-disable @typescript-eslint/no-require-imports */
// Real local browser; every API/checkout request is a fixture. No DEV or provider calls.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const port = 3137;
const base = `http://127.0.0.1:${port}`;
const artifacts = '/tmp/kalend-owner-recovery-preview';
fs.mkdirSync(artifacts, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const errors = [], checks = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitServer() { for (let i = 0; i < 120; i++) { try { if ((await fetch(`${base}/planos`)).ok) return; } catch {} await pause(150); } throw Error('Local Next did not start'); }
(async () => {
  await waitServer();
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const params = new URLSearchParams(location.search);
    localStorage.setItem('kalend:theme', params.get('theme') || 'dark');
    const realFetch = window.fetch.bind(window);
    window.__requests = []; window.__approved = false;
    window.__pending = !!sessionStorage.getItem('fixture-pending');
    const company = { id: 'owner-company', name: 'Empresa fixture', slug: 'fixture', status: 'TRIAL', isActive: true };
    const profile = { user: { id: 'owner', name: 'Owner fixture', email: 'owner@example.invalid', isSuperAdmin: false }, session: { expiresAt: '2026-10-15T12:00:00Z', refreshExpiresAt: '2026-10-20T12:00:00Z' }, systemRole: 'USER', selectedCompanyId: company.id, memberships: [{ id: 'membership', role: 'OWNER', company }] };
    const features = ['Agenda API', 'Financeiro API', 'Relatórios API'].map((name, i) => ({ id: `feature-${i}`, code: `code-${i}`, name, enabled: true }));
    const plans = ['Essencial', 'Profissional', 'Premium'].map((name, i) => ({ id: `plan-${i}`, name, code: `tier-${i}`, description: 'Descrição curta retornada pelo catálogo.', displayOrder: i, monthlyPriceCents: [9900, 14900, 19900][i], yearlyPriceCents: params.has('annual') && i === 2 ? 199000 : null, trialEnabled: true, trialDays: 7, isFeatured: i === 1, badge: null, isActive: true, isPublic: true, maxProfessionals: [1, 5, null][i], maxClients: [50, 200, null][i], maxUnits: [1, 1, 3][i], maxMessages: [100, 500, null][i], features: features.slice(0, i + 1) }));
    window.fetch = async (input, init = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.hostname !== 'api.kalend.invalid') return realFetch(input, init);
      const path = url.pathname;
      window.__requests.push({ path, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
      let data;
      if (path === '/auth/me') data = profile;
      else if (path === '/billing/regularization') {
        const name = params.get('state') || 'TRIAL_EXPIRED';
        const paid = window.__approved || name === 'ACTIVE';
        const trial = name === 'TRIAL_EXPIRED' && !paid;
        const status = paid ? 'ACTIVE' : trial ? 'EXPIRED' : name === 'OVERDUE' ? 'PAST_DUE' : 'SUSPENDED';
        data = { companyId: company.id, serverNow: '2026-10-14T12:00:00Z', revalidateAfterMs: 1000, accessAllowed: paid, accessStatus: paid ? 'ACTIVE' : trial ? 'TRIAL_EXPIRED' : 'SUSPENDED', trial: { active: false, expired: trial, remainingDays: 0, endsAt: '2026-10-01T12:00:00Z' }, financial: { status, requiresAction: !paid && !trial, paymentStatus: name === 'OVERDUE' ? 'OVERDUE' : null }, context: { role: 'OWNER', systemRole: 'USER', commercialApplicable: true }, subscription: { id: 'subscription', planId: 'plan-0', planName: 'Essencial', status, billingInterval: 'MONTHLY', trialEndsAt: '2026-10-01T12:00:00Z', currentPeriodEnd: null, cancelAtPeriodEnd: false }, plans, gateways: [{ provider: 'STRIPE', environment: 'SANDBOX', capabilities: { checkout: true, recurring: false } }, { provider: 'ASAAS', environment: 'SANDBOX', capabilities: { checkout: true, recurring: false } }], pendingCheckout: window.__pending && !paid ? { id: 'payment', planId: 'plan-1', gateway: 'STRIPE', billingInterval: 'MONTHLY', creationState: 'CREATED', checkoutUrl: 'https://checkout.example.invalid/fixture' } : null };
      } else if (path === '/billing/checkout') { window.__pending = true; sessionStorage.setItem('fixture-pending', 'true'); data = { id: 'payment', status: 'PENDING' }; }
      else if (path === '/plans/public') data = plans;
      else if (path === '/communication/push/public-config') data = { available: false, publicKey: null };
      else if (path.includes('notifications')) data = path.includes('unread') ? { count: 0 } : { items: [], unreadCount: 0 };
      else data = [];
      return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    };
  });
  const recovery = page.locator('.k-owner-recovery');
  for (const state of ['TRIAL_EXPIRED', 'OVERDUE', 'SUSPENDED']) {
    for (const theme of ['dark', 'light']) {
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${base}/painel/proprietario?state=${state}&theme=${theme}`);
        await recovery.waitFor();
        assert.equal(new URL(page.url()).pathname, '/painel/proprietario');
        const text = await recovery.innerText();
        assert.doesNotMatch(text, /Assinatura e pagamentos|Atualizar estado|Compare os planos|Perguntas frequentes|Pronto para escolher|Fim do trial|Período de cobrança|Meio de pagamento|Iniciar checkout|Anual/);
        assert.equal(await recovery.locator('.k-plan').count(), 3);
        assert.equal(await recovery.getByRole('button', { name: 'Escolher plano', exact: true }).count(), 3);
        assert.equal(await recovery.getByRole('button', { name: 'Sair', exact: true }).count(), 0);
        assert.equal(await page.locator('.k-push-prompt:visible').count(), 0);
        const geometry = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.k-owner-recovery .k-plan')].map(c => c.getBoundingClientRect());
          return { overflow: document.documentElement.scrollWidth > innerWidth, sameRow: cards.every(c => Math.abs(c.top - cards[0].top) < 2), surface: getComputedStyle(document.querySelector('.k-owner-recovery .k-plan')).backgroundColor };
        });
        assert.equal(geometry.overflow, false);
        assert.equal(geometry.sameRow, width > 640);
        assert.equal(geometry.surface, theme === 'dark' ? 'rgb(20, 21, 24)' : 'rgb(255, 255, 255)');
        if (state === 'TRIAL_EXPIRED') await page.screenshot({ path: `${artifacts}/${theme}-${width}.png`, fullPage: true });
        checks.push({ state, theme, width, passed: true });
      }
    }
  }
  for (const name of ['Essencial', 'Profissional', 'Premium']) {
    const card = recovery.locator('.k-plan').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.getByRole('button').click();
    await recovery.getByRole('heading', { name: `Plano selecionado: ${name}`, exact: true }).waitFor();
    assert.equal(await card.getByRole('button').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => window.__requests.filter(r => r.path === '/billing/checkout').length), 0);
  }
  await recovery.getByRole('button', { name: 'Minha conta', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'Perfil', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Voltar aos planos', exact: true }).click();
  assert.equal(await recovery.locator('[aria-pressed=true]').count(), 1);
  await recovery.getByLabel('Meio de pagamento').selectOption('ASAAS');
  await recovery.getByLabel('CPF ou CNPJ do pagador').waitFor();
  await recovery.getByLabel('Meio de pagamento').selectOption('STRIPE');
  await pause(1200); // automatic revalidation preserves selection
  assert.equal(await recovery.locator('[aria-pressed=true]').count(), 1);
  await recovery.getByRole('button', { name: 'Continuar para pagamento' }).click();
  await recovery.getByRole('heading', { name: 'Pagamento pendente' }).waitFor();
  const requests = await page.evaluate(() => window.__requests.filter(r => r.path === '/billing/checkout'));
  assert.equal(requests.length, 1); assert.equal(requests[0].body.planId, 'plan-2'); assert.equal(requests[0].body.gateway, 'STRIPE'); assert.equal(requests[0].body.billingInterval, 'MONTHLY'); assert.ok(requests[0].body.idempotencyKey);
  assert.equal(await recovery.getByRole('link', { name: 'Continuar pagamento ↗' }).getAttribute('href'), 'https://checkout.example.invalid/fixture');
  await page.reload(); await recovery.getByRole('heading', { name: 'Pagamento pendente' }).waitFor();
  await page.evaluate(() => { window.__approved = true; window.dispatchEvent(new Event('focus')); });
  await recovery.waitFor({ state: 'detached' });
  await page.locator('.k-admin-shell').waitFor();
  assert.equal(new URL(page.url()).pathname, '/painel/proprietario');
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${base}/conta/planos?state=ACTIVE`);
  await page.getByRole('heading', { name: 'Escolha seu plano', exact: true }).waitFor();
  assert.equal(await page.locator('.k-owner-recovery').count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Compare os planos' }).count(), 1);
  assert.equal(await page.getByLabel('Meio de pagamento').count(), 1);
  await page.goto(`${base}/painel/proprietario?annual&theme=dark`);
  await recovery.waitFor(); await recovery.getByLabel('Anual', { exact: true }).check();
  assert.equal(await recovery.locator('.k-plan').nth(0).getByRole('button').isDisabled(), true);
  assert.equal(await recovery.locator('.k-plan').nth(2).getByRole('button').isDisabled(), false);
  assert.deepEqual(errors, []);
  checks.push({ interactions: 'account, three plans, gateways, one checkout, refresh, approval return, unchanged account plans, annual catalog', passed: true });
  fs.writeFileSync(`${artifacts}/results.json`, JSON.stringify(checks, null, 2));
  console.log(JSON.stringify({ checks, screenshots: artifacts, externalGatewayCalls: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.kill(); });
