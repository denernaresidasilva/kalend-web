import { chromium, request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
process.umask(0o077);
const p=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')),f=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
if(p.api!=='https://api-dev.kalend.tech'||p.web!=='https://dev.kalend.tech'||f.database!=='kalend_dev'||f.companies.some(c=>!c.slug.startsWith('qa-booking-')))throw Error('DEV_QA_REQUIRED');
let browser;const contexts=[],results=[];
function must(v,code){if(!v)throw Error(code);}
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});must(r.status()===status,`HTTP_${m}_${path}_${r.status()}_EXPECTED_${status}`);return r.json();}
async function login(role,company){const a=p.accounts.find(a=>a.role===role),c=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(c);await call(c,'post','/auth/login',{email:a.email,password:a.password});await call(c,'post','/auth/tenant',{companyId:company.id});return c;}
try{
 const A=f.companies.find(c=>c.label==='A'),B=f.companies.find(c=>c.label==='B'),owner=await login('OWNER_A',A),other=await login('OWNER_B',B),professional=await login('PROFESSIONAL_A',A);
 if(!f.managementServiceId){const s=await call(owner,'post','/booking/services',{name:'QA Gestão Serviço',durationMinutes:30,priceCents:4000,professionalIds:[f.professional.id]},201);f.managementServiceId=s.id;writeFileSync(process.env.QA_BOOKING_FIXTURE,JSON.stringify(f,null,2),{mode:0o600});}
 await call(other,'patch',`/booking/services/${f.managementServiceId}`,{active:false},404);await call(professional,'patch',`/booking/services/${f.managementServiceId}`,{priceCents:0},403);await call(professional,'get','/booking/members',undefined,403);results.push({name:'management_role_and_company_isolation',status:'PASS'});
 const members=await call(owner,'get','/booking/members');must(members.every(m=>m.user.name&&!('email'in m.user)&&!('passwordHash'in m.user)),'MEMBERS_CONTRACT');
 browser=await chromium.launch({headless:true});const c=await browser.newContext({storageState:await owner.storageState(),viewport:{width:390,height:844}}),page=await c.newPage();await page.goto(p.web+'/painel/proprietario');
 await page.getByText('Gerenciar serviços e profissionais',{exact:true}).click();
 const details=page.locator('summary').filter({hasText:'QA Gestão Serviço · Ativo'}).locator('..');await details.locator(':scope > summary').click();const form=details.locator('form');
 await form.getByLabel('Preço (R$)',{exact:true}).fill('45.00');await form.getByRole('button',{name:'Salvar serviço',exact:true}).click();await page.getByText('Configuração salva.',{exact:true}).waitFor();
 let services=await call(owner,'get','/booking/services');must(services.find(s=>s.id===f.managementServiceId).priceCents===4500,'PRICE_NOT_SAVED');results.push({name:'mobile_service_edit_persisted_in_database',status:'PASS'});
 const updated=page.locator('summary').filter({hasText:'QA Gestão Serviço · Ativo'}).locator('..');await updated.locator(':scope > summary').click();
 await updated.getByLabel('Público',{exact:true}).uncheck();await updated.getByRole('button',{name:'Salvar serviço',exact:true}).click();await page.getByText('Configuração salva.',{exact:true}).waitFor();
 const catalog=await call(owner,'get',`/public/booking/${A.slug}/catalog`);must(!catalog.services.some(s=>s.id===f.managementServiceId),'UNPUBLISHED_STILL_PUBLIC');
 const inbox=await call(owner,'get','/booking/requests'),old=inbox.find(r=>r.id===f.lastBookingId);must(old.items.every(i=>i.priceCents===3000),'HISTORICAL_SNAPSHOT_CHANGED');results.push({name:'unpublish_preserves_confirmed_booking_snapshots',status:'PASS'});
 await call(owner,'patch',`/booking/services/${f.managementServiceId}`,{public:true});
 must(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'MOBILE_OVERFLOW');await page.screenshot({path:'/tmp/kalend-service-management-mobile.png',fullPage:true});
}catch(e){results.push({name:'service_management_dev',status:'FAIL',code:e instanceof Error?e.message:'UNKNOWN'});process.exitCode=1;}
finally{await browser?.close();for(const c of contexts){await c.post(p.api+'/auth/logout').catch(()=>{});await c.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
