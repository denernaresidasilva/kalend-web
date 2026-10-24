import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const seed=process.env.QA_IDENTITY_FILE?JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')):null;
if(seed&&(!seed.provisioned||seed.database!=='kalend_dev'||seed.api!=='https://api-dev.kalend.tech'))throw Error('QA_SCOPE');
test.beforeEach(()=>test.skip(!seed||process.env.QA_MODE!=='dev','Private DEV QA required'));
test('DEV gateway forms show only hosted-provider credential fields without changing configuration',async({page,context})=>{
 const a=seed.accounts.find((a:{role:string})=>a.role==='SUPER_ADMIN');
 expect((await context.request.post(seed.api+'/auth/login',{headers:{Origin:seed.web},data:{email:a.email,password:a.password}})).status()).toBe(200);
 for(const [provider,label] of Object.entries({PAGBANK:'Novo token de checkout',STRIPE:'Nova chave secreta de API',MERCADO_PAGO:'Novo access token',ASAAS:'Nova API key'})){
  await page.goto('/super-admin/configuracoes/pagamentos/'+provider);
  await expect(page.getByLabel(label,{exact:true})).toBeVisible();
  await expect(page.getByLabel(label,{exact:true})).toHaveAttribute('type','password');
  await expect(page.getByLabel(label,{exact:true})).toHaveValue('');
  await expect(page.getByText('Identificação pública',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.getByRole('button',{name:'Salvar configuração'})).toBeDisabled();
 }
});
