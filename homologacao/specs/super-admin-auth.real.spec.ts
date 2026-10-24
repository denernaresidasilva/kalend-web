import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
type Account = { role: string; email: string; password: string };
type Seed = { provisioned: boolean; api: string; web: string; database: string; accounts: Account[]; companies: { id:string; label:string }[] };
const seed: Seed | null = process.env.QA_IDENTITY_FILE ? JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')) : null;
if(seed && (!seed.provisioned || seed.database!=='kalend_dev' || seed.api!=='https://api-dev.kalend.tech' || seed.accounts.some(a=>!a.email.endsWith('@qa.kalend.invalid')))) throw Error('PROVISIONED_DEV_QA_REQUIRED');
test.beforeEach(()=>test.skip(!seed || process.env.QA_MODE!=='dev','Dedicated provisioned QA required.'));

const routes=['/super-admin','/super-admin/empresas','/super-admin/empresas/nova','/super-admin/usuarios','/super-admin/planos','/super-admin/assinaturas','/super-admin/financeiro','/super-admin/comunicacao','/super-admin/configuracoes','/super-admin/configuracoes/aparencia','/super-admin/configuracoes/pagamentos','/super-admin/configuracoes/notificacoes','/super-admin/configuracoes/push','/conta'];

test('DEV-authenticated-admin: actual login form, pages, API integration and responsive shell',async({page,context})=>{
 const a=seed!.accounts.find(a=>a.role==='SUPER_ADMIN')!;
 await context.grantPermissions(['notifications']);
 await page.goto('/');await page.locator('input[name=email]').fill(a.email);await page.locator('input[name=password]').fill(a.password);
 await page.locator('button[type=submit]').click();await expect(page).toHaveURL(/\/super-admin/);
 const exceptions:string[]=[];page.on('pageerror',e=>exceptions.push(e.name));
 for(const route of routes){
  await page.goto(route);await expect(page.locator('.k-admin-shell')).toBeVisible();
  await expect(page.getByText('Acesso não autorizado',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
 }
 await page.goto('/super-admin/configuracoes/aparencia');
 await expect(page.locator('.k-admin-shell')).toBeVisible();
 await page.getByRole('button',{name:'Ativar modo claro'}).first().click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.getByRole('button',{name:'Ativar modo escuro'}).first().click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(exceptions).toEqual([]);
});

test('DEV-authenticated-owner: tenant selection works and Super Admin shell is denied',async({page,context})=>{
 const a=seed!.accounts.find(a=>a.role==='OWNER_A')!;const id=seed!.companies.find(c=>c.label==='A')!.id;
 await context.grantPermissions(['notifications']);
 expect((await context.request.post(seed!.api+'/auth/login',{headers:{Origin:seed!.web},data:{email:a.email,password:a.password}})).status()).toBe(200);
 expect((await context.request.post(seed!.api+'/auth/tenant',{headers:{Origin:seed!.web},data:{companyId:id}})).status()).toBe(200);
 await page.goto('/super-admin');await expect(page.getByRole('heading',{name:'Acesso não autorizado'})).toBeVisible();
 await page.goto('/conta');await expect(page.locator('.k-admin-shell')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
