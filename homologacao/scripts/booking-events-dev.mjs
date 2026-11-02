/** Real DEV SSE check, with QA-only contacts and no external deliveries. */
import { chromium, request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const p=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')),f=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
if(p.api!=='https://api-dev.kalend.tech'||p.web!=='https://dev.kalend.tech'||f.database!=='kalend_dev'||f.companies.some(c=>!c.slug.startsWith('qa-booking-')))throw Error('QA_DEV_REQUIRED');
const results=[],contexts=[];let browser;
function must(value,code){if(!value)throw Error(code);}
async function login(role,company){const a=p.accounts.find(a=>a.role===role);must(/^qa\+[^@]+@qa\.kalend\.invalid$/.test(a.email),'QA_IDENTITY');const c=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(c);for(const [path,data] of [['/auth/login',{email:a.email,password:a.password}],['/auth/tenant',{companyId:company.id}]]){const r=await c.post(p.api+path,{data});must(r.ok(),'QA_LOGIN');}return c;}
try{
 const A=f.companies.find(c=>c.label==='A'),B=f.companies.find(c=>c.label==='B');
 const owner=await login('OWNER_A',A),professional=await login('PROFESSIONAL_A',A),other=await login('OWNER_B',B);
 browser=await chromium.launch({headless:true});
 const pages=[];
 for(const [client,path] of [[owner,'proprietario'],[professional,'profissional'],[other,'proprietario']]){
  const c=await browser.newContext({storageState:await client.storageState(),viewport:{width:390,height:844}});const page=await c.newPage();
  await page.goto(p.web+'/painel/'+path);await page.getByText('Atualizações em tempo real conectadas.',{exact:true}).waitFor({timeout:20000});pages.push(page);
 }
 results.push({name:'authenticated_SSE_owner_professional_other_tenant',status:'PASS'});
 const date=new Date(Date.now()+8*86400000).toISOString().slice(0,10);
 await Promise.all(pages.map(page=>page.getByLabel('Dia da agenda',{exact:true}).fill(date)));
 const anon=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(anon);
 const availability=await(await anon.get(`${p.api}/public/booking/${A.slug}/availability?${new URLSearchParams({date,serviceId:f.service.id})}`)).json();
 const pro=availability.professionals.find(x=>x.id===f.professional.id);must(pro.slots.length,'SLOTS_REQUIRED');
 const name='QA Evento '+randomUUID().slice(0,8);
 const r=await anon.post(`${p.api}/public/booking/${A.slug}/requests`,{data:{idempotencyKey:randomUUID(),termsAccepted:true,customer:{name,email:`${randomUUID()}@qa.kalend.invalid`,phone:'+5511990000002'},items:[{serviceId:f.service.id,professionalId:f.professional.id,startsAt:pro.slots[0]}]}});must(r.status()===201,'REQUEST_FAILED');const booking=await r.json();
 const started=Date.now();await Promise.all(pages.slice(0,2).map(page=>page.getByRole('heading',{name,exact:true}).waitFor({timeout:8000})));
 results.push({name:'new_request_visible_without_reload_before_polling',status:'PASS',latencyMs:Date.now()-started});
 must(await pages[2].getByRole('heading',{name,exact:true}).count()===0,'FOREIGN_TENANT_LEAK');results.push({name:'other_tenant_receives_no_booking',status:'PASS'});
 const accepted=await owner.post(`${p.api}/booking/requests/${booking.id}/accept`,{data:{}});must(accepted.status()===201,'APPROVAL_FAILED');
 await Promise.all(pages.slice(0,2).map(page=>page.locator('.k-agenda-list').getByText(name,{exact:false}).waitFor({timeout:8000})));
 results.push({name:'approval_updates_owner_and_professional_agenda_via_SSE',status:'PASS'});
 for(const page of pages.slice(0,2))must(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'MOBILE_OVERFLOW');
 await pages[0].screenshot({path:'/tmp/kalend-realtime-owner-mobile.png',fullPage:true});
}catch(error){results.push({name:'booking_events_dev',status:'FAIL',code:error instanceof Error?error.message:'UNKNOWN'});process.exitCode=1;}
finally{await browser?.close();for(const c of contexts){await c.post(p.api+'/auth/logout').catch(()=>{});await c.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
