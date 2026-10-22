import { test, expect } from '@playwright/test';
import { installFixture } from '../helpers/fixture';
const modal = '.k-trial-expired-modal';
const ownerRecovery = '.k-owner-recovery';
test.beforeEach(async ({ context }) => { await context.grantPermissions(['notifications']); });
for (const offset of [-300000, -1000, 0, 1000, 3600000]) {
  test(`TRIAL-clock-${offset}: decisão do backend no limite`, async ({ page, context }) => {
    await installFixture(context, { offset }); await page.goto('/painel/proprietario');
    if (offset >= 0) {
      await expect(page.locator(ownerRecovery)).toBeVisible();
      await expect(page.locator('.k-admin-shell')).toHaveCount(0);
      await expect(page.locator(modal)).toHaveCount(0);
    }
    else { await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator(modal)).toHaveCount(0); }
  });
}
test('TRIAL-auto: vence sem refresh, pagamento restaura', async ({ page, context }) => {
  const { state } = await installFixture(context);
  await page.goto('/painel/proprietario'); await expect(page.locator('.k-admin-shell')).toBeVisible();
  state.offset = 1000; await expect(page.locator(ownerRecovery)).toBeVisible();
  await expect(page.locator('.k-admin-shell')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.locator(ownerRecovery)).toBeVisible();
  state.fail = true; await page.waitForTimeout(1200); await expect(page.locator(ownerRecovery)).toBeVisible();
  await expect(page.locator('.k-admin-shell')).toHaveCount(0);
  state.fail = false; state.approved = true; await expect(page.locator(ownerRecovery)).toHaveCount(0);
  await expect(page.locator('.k-admin-shell')).toBeVisible();
});
test('TRIAL-clock-browser: relógio local não autoriza estado', async ({ page, context }) => {
  await context.addInitScript(() => { Date.now = () => 4102444800000; });
  await installFixture(context); await page.goto('/painel/proprietario');
  await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator(modal)).toHaveCount(0);
});
test('TRIAL-routes: rota direta, reload, nova aba e navegação', async ({ page, context }) => {
  await installFixture(context, { offset: 1000 });
  for (const route of ['/conta', '/conta/planos', '/conta/configuracoes/email', '/planos']) {
    await page.goto(route); await expect(page.locator(modal)).toBeVisible();
  }
  await page.reload(); await expect(page.locator(modal)).toBeVisible();
  await page.evaluate(() => { history.pushState({}, '', '/conta'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator(modal)).toBeVisible();
  const other = await context.newPage(); await other.goto('/painel/proprietario'); await expect(other.locator(ownerRecovery)).toBeVisible(); await expect(other.locator('.k-admin-shell')).toHaveCount(0); await other.close();
});
test('CHECKOUT: plano, periodicidade, gateway e pendência', async ({ page, context }) => {
  // The full account recovery still uses a modal. The owner entry uses its approved compact screen.
  const { state, plan } = await installFixture(context, { offset: 1000 }); await page.goto('/conta');
  const dialog = page.locator(modal); await expect(dialog).toBeVisible(); await expect(dialog).toContainText('Plano QA');
  await dialog.locator('input[name=plan]').check(); await dialog.locator('select').first().selectOption('STRIPE');
  await dialog.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(dialog).toContainText('Pagamento pendente');
  expect(state.checkout).toHaveLength(1); expect(state.checkout[0]).toMatchObject({ planId: plan.id, billingInterval: 'MONTHLY' });
  await expect(dialog).toBeVisible();
});
test('OWNER-recovery: seleção compacta mantém bloqueio até confirmação autoritativa', async ({ page, context }) => {
  const { state, plan } = await installFixture(context, { offset: 1000 });
  await page.goto('/painel/proprietario');
  const recovery = page.locator(ownerRecovery);
  await expect(recovery).toBeVisible();
  await expect(page.locator(modal)).toHaveCount(0);
  await expect(recovery.locator('input[name=plan]')).toHaveCount(0);
  await recovery.getByRole('button', { name: 'Escolher plano', exact: true }).click();
  await expect(recovery.getByRole('button', { name: 'Plano selecionado', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await recovery.getByLabel('Meio de pagamento').selectOption('STRIPE');
  await recovery.getByRole('button', { name: 'Continuar para pagamento', exact: true }).click();
  await expect(recovery.getByRole('region', { name: 'Pagamento pendente' })).toBeVisible();
  expect(state.checkout).toHaveLength(1);
  expect(state.checkout[0]).toMatchObject({ planId: plan.id, billingInterval: 'MONTHLY', gateway: 'STRIPE' });
  await expect(page.locator('.k-admin-shell')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(recovery).toBeVisible();
  state.approved = true;
  await expect(page.locator(ownerRecovery)).toHaveCount(0);
  await expect(page.locator('.k-admin-shell')).toBeVisible();
});
test('AUTH: login válido, logout, rota protegida', async ({ page, context }) => {
  await installFixture(context, { authenticated: false }); await page.goto('/painel/proprietario');
  await expect(page.locator('input[name=email]')).toBeVisible();
  await page.locator('input[name=email]').fill('qa+login@example.invalid'); await page.locator('input[name=password]').fill('QA-valid-password');
  await page.locator('button[type=submit]').click(); await expect(page.locator('.k-admin-shell')).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page.locator('input[name=email]')).toBeVisible();
});
test('AUTH: login inválido', async ({ page, context }) => {
  await installFixture(context, { authenticated: false }); await page.goto('/');
  await page.locator('input[name=email]').fill('qa+invalid@example.invalid'); await page.locator('input[name=password]').fill('wrong-password');
  await page.locator('button[type=submit]').click(); await expect(page.locator('.login-card [role=alert]')).toBeVisible(); await expect(page.locator('.k-admin-shell')).toHaveCount(0);
});
test('AUTH: sessão expirada', async ({ page, context }) => {
  const { state } = await installFixture(context); await page.goto('/conta'); await expect(page.locator('.k-admin-shell')).toBeVisible();
  state.authenticated = false; await page.evaluate(() => dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL('http://127.0.0.1:3131/');
  await expect(page.locator('input[name=email]')).toBeVisible();
  await expect(page.locator('.k-admin-shell')).toHaveCount(0);
  await expect(page.locator('.k-account-profile')).toHaveCount(0);
});
test('GLOBAL: Super Admin não bloqueado pelo trial', async ({ page, context }) => {
  await installFixture(context, { offset: 1000, admin: true }); await page.goto('/super-admin/configuracoes');
  await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator(modal)).toHaveCount(0);
});
for (const route of ['/conta/configuracoes', '/conta/notificacoes', '/conta/planos']) {
  test(`MOBILE-layout: ${route}`, async ({ page, context }) => {
    await installFixture(context); await page.goto(route); await expect(page.locator('main')).toBeVisible();
    const heading = route.endsWith('configuracoes') ? 'Configurações' : route.endsWith('notificacoes') ? 'Notificações' : 'Escolha seu plano';
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
test('RATE-frontend: 429 não gera loop de login', async ({ page, context }) => {
  await installFixture(context, { authenticated: false }); let attempts = 0;
  await context.route('https://api.kalend.invalid/auth/login', async route => { attempts++; await route.fulfill({ status: 429, json: {} }); });
  await page.goto('/'); await page.locator('input[name=email]').fill('qa+rate@example.invalid'); await page.locator('input[name=password]').fill('wrong-password');
  await page.locator('button[type=submit]').click(); await expect(page.locator('.login-card [role=alert]')).toContainText('Muitas tentativas');
  await page.waitForTimeout(1500); expect(attempts).toBe(1);
});
