import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const api = 'https://api-dev.kalend.tech';
const origin = 'https://dev.kalend.tech';

test.beforeEach(() => { test.skip(process.env.QA_MODE !== 'dev', 'Explicit DEV target only.'); });

test('DEV-admin-boundary: anonymous requests cannot read global or communication data', async ({ request }) => {
  for (const path of ['/companies', '/users', '/users/summary', '/plans', '/subscriptions', '/finance', '/finance/summary', '/communication/email', '/communication/evolution/status', '/communication/gmail/status', '/communication/push/subscriptions']) {
    const response = await request.get(`${api}${path}`);
    expect(response.status(), path).toBe(401);
  }
});

test('DEV-invalid-token: fabricated access cookie never authenticates', async ({ request }) => {
  const response = await request.get(`${api}/auth/me`, { headers: { Cookie: '__Host-kalend_access=qa-invalid-token' } });
  expect(response.status()).toBe(401);
});

test('DEV-origin: foreign origin is denied before login', async ({ request }) => {
  const response = await request.post(`${api}/auth/login`, { headers: { Origin: 'https://untrusted.invalid' }, data: {} });
  expect(response.status()).toBe(403);
});

test('DEV-invalid-login: nonexistent QA identity receives generic rejection', async ({ request }) => {
  const response = await request.post(`${api}/auth/login`, { headers: { Origin: origin }, data: { email: `qa+absent-${randomUUID()}@qa.kalend.invalid`, password: randomUUID() } });
  expect(response.status()).toBe(401);
  const body = await response.json(); expect(body.message).toBe('E-mail ou senha inválidos.');
});

test('DEV-admin-navigation: anonymous protected pages redirect without rendering admin shell', async ({ page }) => {
  const exceptions: string[] = []; page.on('pageerror', error => exceptions.push(error.name));
  for (const path of ['/super-admin', '/super-admin/empresas', '/super-admin/financeiro', '/super-admin/comunicacao', '/conta']) {
    await page.goto(path);
    await expect(page).toHaveURL(`${origin}/`);
    await expect(page.locator('input[name=email]')).toBeVisible();
    await expect(page.locator('.k-admin-shell')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(exceptions).toEqual([]);
});
