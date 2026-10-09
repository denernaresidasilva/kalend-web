import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { installFixture } from '../helpers/fixture';
import { installPushFixture } from '../helpers/push-fixture';
const popup = '.k-push-prompt, .k-push-modal';
async function permission(context: BrowserContext, page: Page, value: 'granted' | 'denied') {
  const cdp = await context.newCDPSession(page); const { targetInfo } = await cdp.send('Target.getTargetInfo');
  await cdp.send('Browser.setPermission', { permission: { name: 'notifications' }, setting: value, origin: 'http://127.0.0.1:3131', browserContextId: targetInfo.browserContextId });
}
test('PUSH-A: default mostra convite único; dispensar não força nova inscrição', async ({ page, context }) => {
  const f = await installPushFixture(context, { local: false, backend: false });
  await page.goto('/painel/proprietario'); await expect(page.locator('.k-push-prompt')).toBeVisible();
  await expect(page.locator('.k-push-prompt')).toHaveCount(1);
  expect(await page.evaluate(() => Notification.permission)).toBe('default');
  await page.getByRole('button', { name: 'Agora não', exact: true }).click(); await expect(page.locator(popup)).toHaveCount(0);
  expect(f.push.posts).toBe(0);
});
for (const kind of ['valid','missing','backend-missing','stale'] as const) {
  test(`PUSH-granted-${kind}: permissão não é convite; recuperação só nas configurações`, async ({ page, context }) => {
    await permission(context,page,'granted');
    const f = await installPushFixture(context, { local: kind !== 'missing', backend: kind !== 'backend-missing', stale: kind === 'stale', otherDevice: true });
    await page.goto('/conta/configuracoes/push');
    await expect(page.locator('.push-settings')).toBeVisible(); expect(await page.evaluate(() => Notification.permission)).toBe('granted');
    await expect(page.locator(popup)).toHaveCount(0);
    if (kind === 'valid') await expect(page.locator('.push-settings')).toContainText('Notificações ativadas');
    else {
      await expect(page.locator('.push-settings')).toContainText('Permissão concedida, mas Push precisa ser reconectado');
      await page.getByRole('button', { name: 'Reconectar Push neste dispositivo' }).click();
      await expect(page.locator('.push-settings')).toContainText('Dispositivo registrado para Push.');
      await expect(page.locator('.push-settings')).toContainText('Notificações ativadas');
      expect(f.push.posts).toBe(1);
    }
    await page.reload(); await expect(page.locator('.push-settings')).toContainText('Notificações ativadas'); await expect(page.locator(popup)).toHaveCount(0);
    expect(f.push.posts).toBe(kind === 'valid' ? 0 : 1); expect(f.push.deletes).toBe(0);
    expect(f.push.devices.some(d=>d.id==='qa-other-device')).toBe(true);
  });
}
test('PUSH-D: denied permanece sem popup ou pedidos repetidos', async ({ page, context }) => {
  await permission(context,page,'denied'); await installPushFixture(context,{local:false,backend:false});
  for (const path of ['/painel/proprietario','/conta','/conta/configuracoes/push']) { await page.goto(path); await expect(page.locator(path.endsWith('/push') ? '.push-settings' : '.k-admin-shell')).toBeVisible(); await page.waitForTimeout(500); await expect(page.locator(popup)).toHaveCount(0); }
  await expect(page.locator('.push-settings')).toContainText('Permita notificações nas configurações do navegador');
});
test('PUSH-navigation: granted resiste a flags, reload, rota, SPA, nova aba e logout/login', async ({ page, context }) => {
  await permission(context,page,'granted'); await installPushFixture(context,{local:false,backend:false});
  await context.addInitScript(() => { localStorage.setItem('notificationPrompt','show'); localStorage.setItem('pushEnabled','false'); sessionStorage.setItem('subscribed','false'); document.cookie='notificationPrompt=show; path=/'; });
  await page.goto('/painel/proprietario'); await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator(popup)).toHaveCount(0);
  await page.reload(); await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator(popup)).toHaveCount(0);
  await page.evaluate(() => { history.pushState({},'', '/conta'); dispatchEvent(new PopStateEvent('popstate')); }); await expect(page.locator(popup)).toHaveCount(0);
  const other = await context.newPage(); await other.goto('/conta'); await expect(other.locator('.k-admin-shell')).toBeVisible(); await expect(other.locator(popup)).toHaveCount(0); await other.close();
  await page.goto('/conta'); await page.getByRole('button',{name:'Sair',exact:true}).click(); await expect(page.locator('input[name=email]')).toBeVisible();
  await page.locator('input[name=email]').fill('qa+push@example.invalid'); await page.locator('input[name=password]').fill('QA-valid-password'); await page.locator('button[type=submit]').click();
  await expect(page.locator('.k-admin-shell')).toBeVisible(); expect(await page.evaluate(()=>Notification.permission)).toBe('granted'); await expect(page.locator(popup)).toHaveCount(0);
});
for (const choice of ['granted','denied'] as const) {
  test(`PUSH-activate-${choice}: resultado nativo fecha modal sem insistência`, async ({ page,context }) => {
    const f = await installPushFixture(context,{local:false,backend:false});
    await context.exposeBinding('__qaPermissionChoice', async () => { await permission(context,page,choice); return choice; });
    await context.addInitScript(() => { Notification.requestPermission = async () => { const w=window as unknown as { __qaPermissionChoice: () => Promise<NotificationPermission> }; return w.__qaPermissionChoice(); }; });
    await page.goto('/painel/proprietario'); await expect(page.locator('.k-push-prompt')).toBeVisible();
    await page.getByRole('button',{name:'Ativar notificações',exact:true}).click(); await page.getByRole('button',{name:'Ativar agora',exact:true}).click();
    await expect(page.locator(popup)).toHaveCount(0); expect(await page.evaluate(()=>Notification.permission)).toBe(choice);
    if (choice==='granted') await expect.poll(()=>f.push.posts).toBe(1); else expect(f.push.posts).toBe(0);
    await page.goto('/conta/configuracoes/push'); await expect(page.locator('.push-settings')).toBeVisible(); await expect(page.locator(popup)).toHaveCount(0);
  });
}
test('PUSH-SW: registro/ready nativos no escopo raiz, sem unregister', async ({ page,context }) => {
  await permission(context,page,'granted'); await installPushFixture(context); await page.goto('/conta/configuracoes/push');
  await expect(page.locator('.push-settings')).toContainText('Notificações ativadas');
  const sw=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return{scope:new URL(r.scope).pathname,script:new URL(r.active!.scriptURL).pathname,push:!!r.pushManager,subscription:!!await r.pushManager.getSubscription()};});
  expect(sw).toEqual({scope:'/',script:'/sw.js',push:true,subscription:true});
});
test('PUSH-GLOBAL: Super Admin conserva contexto separado', async ({ page,context }) => {
  await permission(context,page,'granted'); const f=await installPushFixture(context,{admin:true}); await page.goto('/super-admin/configuracoes/push');
  await expect(page.locator('.push-settings')).toContainText('Notificações ativadas'); expect(f.profile.selectedCompanyId).toBeNull(); await expect(page.locator(popup)).toHaveCount(0);
});
test('PUSH-recovery-failure: granted com erro de registro nunca reabre convite', async ({ page,context }) => {
  await permission(context,page,'granted'); const f=await installPushFixture(context,{local:false,backend:false,registrationFails:true}); await page.goto('/conta/configuracoes/push');
  await page.getByRole('button',{name:'Reconectar Push neste dispositivo'}).click(); await expect(page.locator(popup)).toHaveCount(0); await expect.poll(()=>f.push.posts).toBe(1);
  await expect(page.locator('.push-settings')).toContainText('Permissão concedida, mas Push precisa ser reconectado');
});

test('PUSH-F: backend antigo sem subscription local não remove outro dispositivo', async ({ page,context }) => {
  await permission(context,page,'granted'); const f=await installPushFixture(context,{local:false,backend:false,otherDevice:true});
  await page.goto('/conta/configuracoes/push'); await expect(page.locator('.push-settings')).toContainText('Permissão concedida, mas Push precisa ser reconectado');
  await expect(page.locator(popup)).toHaveCount(0); await page.getByRole('button',{name:'Reconectar Push neste dispositivo'}).click();
  await expect(page.locator('.push-settings')).toContainText('Notificações ativadas'); expect(f.push.devices).toHaveLength(2); expect(f.push.deletes).toBe(0);
  expect(f.push.devices.some(d=>d.id==='qa-other-device')).toBe(true);
});
test('PUSH-unsupported: ausência de PushManager não provoca convite ou solicitação', async ({ page,context }) => {
  await installFixture(context); await context.addInitScript(()=>Object.defineProperty(window,'PushManager',{value:undefined,configurable:true}));
  await page.goto('/conta/configuracoes/push'); await expect(page.locator('.push-settings')).toContainText('Notificações indisponíveis'); await expect(page.locator(popup)).toHaveCount(0);
});
