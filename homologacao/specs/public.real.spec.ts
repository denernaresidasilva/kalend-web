import { test, expect } from '@playwright/test';
const mode = process.env.QA_MODE;
const api = mode === 'staging' ? 'https://api-staging.kalend.tech' : 'https://api-dev.kalend.tech';
test('DEV-health: API e banco disponíveis', async ({ request }) => {
  const response = await request.get(`${api}/health`); expect(response.status()).toBe(200); expect(await response.json()).toMatchObject({ status: 'ok', api: 'online', database: 'connected' });
});
test('DEV-login-public: formulário real e mobile', async ({ page }) => {
  const response = await page.goto('/'); expect(response?.status()).toBe(200); await expect(page.locator('input[name=email]')).toBeVisible(); await expect(page.locator('input[name=password]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test('DEV-catalog: planos reais publicados', async ({ page, request }) => {
  const response = await request.get(`${api}/plans/public`); expect(response.status()).toBe(200); const plans = await response.json(); expect(plans.length).toBeGreaterThan(0);
  await page.goto('/planos'); for (const plan of plans) await expect(page.getByText(plan.name, { exact: true }).first()).toBeVisible();
});
test('DEV-anonymous: API nega acesso protegido', async ({ request }) => {
  for (const path of ['/auth/me', '/auth/tenant', '/companies', '/billing/regularization']) expect((await request.get(`${api}${path}`)).status()).toBe(401);
});
