import { test, expect } from '@playwright/test';
import { installFixture } from '../helpers/fixture';
for (const permission of ['granted', 'denied', 'default'] as const) {
  test(`PUSH-permission-${permission}: convite e navegação`, async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    const { targetInfo } = await cdp.send('Target.getTargetInfo');
    await cdp.send('Browser.setPermission', { permission: { name: 'notifications' }, setting: permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'prompt', origin: 'http://127.0.0.1:3131', browserContextId: targetInfo.browserContextId });
    await installFixture(context);
    for (const path of ['/painel/proprietario', '/conta/notificacoes', '/conta']) {
      await page.goto(path); await expect(page.locator('.k-admin-shell')).toBeVisible();
      expect(await page.evaluate(() => Notification.permission)).toBe(permission);
      await page.waitForTimeout(500);
      if (permission !== 'default') await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
    }
    await page.reload(); await expect(page.locator('.k-admin-shell')).toBeVisible();
    if (permission !== 'default') await expect(page.locator('.k-push-prompt, .k-push-modal')).toHaveCount(0);
    // default pode aparecer; provider fixture indisponível não prova convite nem entrega.
  });
}
