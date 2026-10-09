import { test, expect } from '@playwright/test';
import { installFixture } from '../helpers/fixture';
test('PUSH-diagnosis: permissão nativa granted com convite antigo sem evento Permissions API', async ({ page, context }) => {
  await context.addInitScript(() => {
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = descriptor => descriptor.name === 'notifications' ? Promise.reject(new Error('Notifications Permissions API unavailable in this browser')) : query(descriptor);
  });
  await installFixture(context);
  await page.goto('/painel/proprietario');
  await expect(page.locator('.k-push-prompt')).toBeVisible();
  expect(await page.evaluate(() => Notification.permission)).toBe('default');
  await context.grantPermissions(['notifications'], { origin: 'http://127.0.0.1:3131' });
  expect(await page.evaluate(() => Notification.permission)).toBe('granted');
  await page.waitForTimeout(750);
  await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
  const evidence = await page.evaluate(async () => ({
    permission: Notification.permission, inviteCount: document.querySelectorAll('.k-push-prompt').length,
    inviteTitle: document.querySelector('#push-prompt-title')?.textContent,
    activationModals: document.querySelectorAll('.k-push-modal').length,
    localKeys: Object.keys(localStorage), sessionKeys: Object.keys(sessionStorage),
    workerScopes: (await navigator.serviceWorker.getRegistrations()).map(r => new URL(r.scope).pathname),
    condition: 'Convite montado em default; Notifications Permissions API indisponível; autorização nativa passa a granted sem novo render',
    layer: 'LOCAL CONTROLADO: Chrome real + perfil/API fixture; não reproduz perfil DEV do usuário',
  }));
  await test.info().attach('regressao-permissao-sem-evento', { body: JSON.stringify(evidence), contentType: 'application/json' });
  console.log(JSON.stringify(evidence));
});
