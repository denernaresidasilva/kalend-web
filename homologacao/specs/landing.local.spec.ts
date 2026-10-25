import { expect, test } from '@playwright/test';

const plan = {
  id: '11111111-1111-4111-8111-111111111111', name: 'Plano QA', code: 'plano-qa',
  description: 'Plano de teste da landing local.', monthlyPriceCents: 8900, yearlyPriceCents: 89000,
  trialEnabled: true, trialDays: 7, badge: null, isFeatured: true, displayOrder: 0,
  maxProfessionals: 5, maxClients: null, maxUnits: 1, maxMessages: 100,
  isActive: true, isPublic: true, features: [{ id: 'feature-1', code: 'agenda', name: 'Agenda', enabled: true }],
};
const company = { id: '33333333-3333-4333-8333-333333333333', name: 'Empresa QA LP', slug: 'empresa-qa-lp', status: 'TRIAL', isActive: true };
const profile = {
  user: { id: '22222222-2222-4222-8222-222222222222', name: 'Pessoa QA', email: 'lp.qa@example.test', isSuperAdmin: false },
  systemRole: 'USER', memberships: [{ id: 'membership-1', role: 'OWNER', company }], selectedCompanyId: company.id,
  session: { expiresAt: '2030-01-01T00:00:00.000Z', refreshExpiresAt: '2030-02-01T00:00:00.000Z' },
};

test('landing signup creates no session, confirms success, redirects to login, and accepts normal login', async ({ page }) => {
  let signedUp = false;
  let loggedIn = false;
  let submitted: Record<string, unknown> | undefined;
  let loginBody: Record<string, unknown> | undefined;
  const apiOrigin = 'https://api-dev.kalend.tech';
  await page.route(`${apiOrigin}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/plans/public') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([plan]) });
    if (url.pathname === '/auth/me') return route.fulfill({ status: loggedIn ? 200 : 401, contentType: 'application/json', body: JSON.stringify(loggedIn ? profile : { message: 'unauthorized' }) });
    if (url.pathname === '/auth/refresh') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'unauthorized' }) });
    if (url.pathname === '/auth/trial-signup' && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      signedUp = true;
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ created: true, user: profile.user, company, subscription: { status: 'TRIALING' } }) });
    }
    if (url.pathname === '/auth/login' && route.request().method() === 'POST') {
      loginBody = route.request().postDataJSON() as Record<string, unknown>;
      loggedIn = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true }) });
    }
    if (url.pathname === '/auth/tenant' && route.request().method() === 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
    if (url.pathname === '/billing/regularization') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ serverNow: '2026-10-25T12:00:00.000Z', accessAllowed: true, accessStatus: 'TRIAL_ACTIVE', revalidateAfterMs: 15000, trial: { active: true, endsAt: '2026-11-01T12:00:00.000Z', remainingDays: 7, expired: false }, financial: { requiresAction: false, status: null }, context: { companyId: company.id, role: 'OWNER', commercialApplicable: true }, companyId: company.id, subscription: { id: 'subscription-qa', status: 'TRIALING', planId: plan.id, planName: plan.name, billingInterval: 'MONTHLY', trialStartedAt: '2026-10-25T12:00:00.000Z', trialEndsAt: '2026-11-01T12:00:00.000Z', currentPeriodEnd: null, graceEndsAt: null, cancelAtPeriodEnd: false } }) });
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not mocked' }) });
  });

  await page.goto('/lp');
  await expect(page).toHaveURL(/\/lp$/);
  await expect(page.getByRole('heading', { name: /Você cuida dos seus clientes/i })).toBeVisible();
  await expect(page.getByText('Plano QA', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Testar grátis este plano/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Sem cartão/i).first()).toBeVisible();
  await dialog.getByLabel('Nome da empresa').fill('Empresa QA LP');
  await dialog.getByLabel('Nome do responsável').fill('Pessoa QA');
  await dialog.getByLabel('WhatsApp').fill('+55 (11) 99999-1234');
  await dialog.getByLabel('E-mail').fill('lp.qa@example.test');
  await dialog.locator('input[name="password"]').fill('Kalend-Segura-2026!');
  await dialog.locator('input[name="confirmPassword"]').fill('Kalend-Segura-2026!');
  await dialog.getByLabel(/Li e aceito/).check();
  const signupResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/trial-signup');
  await dialog.getByRole('button', { name: /Criar minha conta grátis/i }).click();
  expect((await signupResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Conta criada com sucesso!' })).toBeVisible();
  expect((await page.context().cookies()).filter(cookie => cookie.name.startsWith('__Host-kalend_'))).toHaveLength(0);
  await page.getByRole('link', { name: /Ir para login/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await page.getByLabel('E-mail').fill('lp.qa@example.test');
  await page.locator('form input[name="password"]').fill('Kalend-Segura-2026!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/painel\/proprietario$/);
  expect(loginBody).toEqual({ email: 'lp.qa@example.test', password: 'Kalend-Segura-2026!' });
  expect(signedUp).toBe(true);
  expect(submitted).toMatchObject({ planId: plan.id, acceptTerms: true, marketingConsent: false, whatsapp: '+5511999991234' });
  expect(submitted).not.toHaveProperty('card');
  expect(submitted).not.toHaveProperty('paymentMethod');
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
});
