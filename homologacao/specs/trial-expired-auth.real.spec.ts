import{test,expect}from'@playwright/test';import{readFileSync}from'node:fs';
const p=process.env.QA_IDENTITY_FILE?JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')):null;
test('DEV-expired-QA-trial: authenticated recovery modal survives direct routes and reload',async({page,context})=>{
 test.skip(process.env.QA_MODE!=='dev'||!p?.provisioned||!p.extraExpiredFixture,'Dedicated expired QA fixture required');
 if(p.database!=='kalend_dev'||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE');
 const a=p.accounts.find((x:{role:string})=>x.role==='OWNER_A');await context.grantPermissions(['notifications']);
 expect((await context.request.post(p.api+'/auth/login',{headers:{Origin:p.web},data:{email:a.email,password:a.password}})).status()).toBe(200);
 expect((await context.request.post(p.api+'/auth/tenant',{headers:{Origin:p.web},data:{companyId:p.extraExpiredFixture.companyId}})).status()).toBe(200);
 const state=await(await context.request.get(p.api+'/billing/regularization')).json();expect(state.accessAllowed).toBe(false);expect(state.accessStatus).toBe('TRIAL_EXPIRED');
 expect((await context.request.get(p.api+'/auth/tenant')).status()).toBe(403);
 for(const route of ['/painel/proprietario','/conta/planos','/conta/configuracoes/email']){
  await page.goto(route);
  if(route==='/painel/proprietario'){await expect(page.locator('.k-owner-recovery')).toBeVisible();await expect(page.locator('.k-admin-shell')).toHaveCount(0);await expect(page.locator('.k-trial-expired-modal')).toHaveCount(0);}
  else await expect(page.locator('.k-trial-expired-modal')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.reload();await expect(page.locator('.k-trial-expired-modal')).toBeVisible();
});
