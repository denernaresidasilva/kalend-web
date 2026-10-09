import { test, expect } from '@playwright/test';
import { loginQA } from '../helpers/real';
// Exclusivamente conta QA dedicada; nenhuma interceptação de API neste arquivo.
const email = process.env.QA_OWNER_EMAIL;
const password = process.env.QA_OWNER_PASSWORD;
const companyId = process.env.QA_OWNER_COMPANY_ID;
const api = process.env.QA_MODE === 'staging' ? 'https://api-staging.kalend.tech' : 'https://api-dev.kalend.tech';
test('DEV-PUSH-granted: incidente BUG-01 em sessão QA real', async ({ page, context }) => {
  test.skip(!email || !password || !companyId, 'Sem credenciais QA e company ID; NÃO TESTADO.');
  await context.grantPermissions(['notifications']);
  const origin = process.env.QA_MODE === 'staging' ? 'https://staging.kalend.tech' : 'https://dev.kalend.tech';
  await loginQA(context, email!, password!, companyId);
  for (const route of ['/painel/proprietario', '/conta', '/conta/notificacoes']) {
    await page.goto(route); await expect(page.locator('.k-admin-shell')).toBeVisible(); expect(await page.evaluate(() => Notification.permission)).toBe('granted');
    await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0); await page.waitForTimeout(3000); await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
  }
  await page.reload(); await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
  const tab = await context.newPage(); await tab.goto('/conta'); await expect(tab.locator('.k-admin-shell')).toBeVisible(); await expect(tab.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0); await tab.close();
  // Diagnóstico sem gravar endpoints/token de subscription ou cookies em anexos.
  const diagnostic = await page.evaluate(async () => ({ permission: Notification.permission, serviceWorkers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }));
  await test.info().attach('push-diagnostic', { body: JSON.stringify(diagnostic), contentType: 'application/json' });
  expect((await context.request.post(`${api}/auth/logout`, { headers: { Origin: origin }, data: {} })).status()).toBe(204);
});

test('DEV-PUSH-permission-transition: default→granted sem observer, dados QA reais', async ({ page,context }) => {
  test.skip(!email || !password || !companyId,'Sem QA autenticado; não substituir API DEV por fixture.');
  await context.addInitScript(()=>{
    const query=navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query=descriptor=>descriptor.name==='notifications'?Promise.reject(new Error('Notifications observer unavailable')):query(descriptor);
  });
  await loginQA(context,email!,password!,companyId);
  await page.goto('/painel/proprietario');
  await expect(page.locator('.k-push-prompt')).toBeVisible();
  expect(await page.evaluate(()=>Notification.permission)).toBe('default');
  await context.grantPermissions(['notifications']);
  expect(await page.evaluate(()=>Notification.permission)).toBe('granted');
  await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
  // O browser controla a disponibilidade do observer; autenticação/API/assets DEV são reais.
});
