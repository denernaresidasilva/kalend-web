/** Real DEV booking flow. Reads credentials privately and prints only assertions. */
import { request, chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const identities=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8'));
const fixture=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
const api=identities.api, origin=identities.web;
if(api!=='https://api-dev.kalend.tech'||origin!=='https://dev.kalend.tech'||fixture.database!=='kalend_dev'||fixture.companies.some(c=>!c.slug.startsWith('qa-booking-')))throw Error('DEV_QA_REQUIRED');
const contexts=[], results=[];
function must(v,code){if(!v)throw Error(code);}
async function call(c,method,path,data,status=200){const r=await c[method](api+path,data===undefined?{}:{data});must(r.status()===status,`HTTP_${method}_${path.split('?')[0]}_${r.status()}_EXPECTED_${status}`);return status===204?null:r.json();}
async function login(role,company){const account=identities.accounts.find(a=>a.role===role);must(/^qa\+[^@]+@qa\.kalend\.invalid$/.test(account.email),'QA_ACCOUNT_REQUIRED');const c=await request.newContext({extraHTTPHeaders:{Origin:origin}});contexts.push(c);await call(c,'post','/auth/login',{email:account.email,password:account.password});await call(c,'post','/auth/tenant',{companyId:company.id});return c;}
async function step(name,fn){await fn();results.push({name,status:'PASS'});}
const A=fixture.companies.find(c=>c.label==='A'),B=fixture.companies.find(c=>c.label==='B');
try{
 const owner=await login('OWNER_A',A), other=await login('OWNER_B',B), professional=await login('PROFESSIONAL_A',A);
 const anon=await request.newContext({extraHTTPHeaders:{Origin:origin}});contexts.push(anon);
 if(!fixture.service){
  const setup=await call(owner,'post','/booking/setup/first-service',{service:{name:'QA Corte',durationMinutes:30,priceCents:3000},professional:{membershipId:A.ownerMembershipId,displayName:'QA Proprietário'},availability:Array.from({length:7},(_,weekday)=>({weekday,startMinute:540,endMinute:1080}))},201);
  fixture.service=setup.service;fixture.ownerProfessional=setup.professional;
  fixture.professional=await call(owner,'post','/booking/professionals',{membershipId:A.professionalMembershipId,displayName:'QA Profissional'},201);
  await call(owner,'post',`/booking/professionals/${fixture.professional.id}/availability`,{windows:Array.from({length:7},(_,weekday)=>({weekday,startMinute:540,endMinute:1080}))},201);
  await call(owner,'post',`/booking/services/${fixture.service.id}/professionals`,{professionalIds:[fixture.ownerProfessional.id,fixture.professional.id]},201);
  writeFileSync(process.env.QA_BOOKING_FIXTURE,JSON.stringify(fixture,null,2),{mode:0o600});
 }
 let booking={id:fixture.lastBookingId}; let day=fixture.day;
 if(process.env.QA_BOOKING_BROWSER_ONLY!=='1'){
 let publicCatalog;
 await step('public_catalog_persisted_service',async()=>{publicCatalog=await call(anon,'get',`/public/booking/${A.slug}/catalog`);must(publicCatalog.services.some(s=>s.id===fixture.service.id),'CATALOG_SERVICE_MISSING');});
 day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 const available=await call(anon,'get',`/public/booking/${A.slug}/availability?serviceId=${fixture.service.id}&date=${day}`);
 const ownerSlots=available.professionals.find(p=>p.id===fixture.ownerProfessional.id).slots;
 const profSlots=available.professionals.find(p=>p.id===fixture.professional.id).slots;
 must(ownerSlots.length>2&&profSlots.length>2,'SLOTS_REQUIRED');
 const input={idempotencyKey:randomUUID(),termsAccepted:true,customer:{name:'QA Booking Client',email:`booking-${randomUUID()}@qa.kalend.invalid`,phone:'+5511990000001'},items:[{serviceId:fixture.service.id,professionalId:fixture.ownerProfessional.id,startsAt:ownerSlots[0]},{serviceId:fixture.service.id,professionalId:fixture.professional.id,startsAt:profSlots[1]}]};
 await step('public_multi_service_request',async()=>{booking=await call(anon,'post',`/public/booking/${A.slug}/requests`,input,201);must(booking.items.length===2&&booking.status==='REQUESTED','REQUEST_INVALID');});
 await step('public_idempotency_preserves_request',async()=>{const again=await call(anon,'post',`/public/booking/${A.slug}/requests`,input,201);must(again.id===booking.id,'IDEMPOTENCY');});
 await step('pending_request_does_not_enter_agenda',async()=>{const agenda=await call(owner,'get',`/booking/agenda?date=${day}`);must(!agenda.items.some(i=>i.request.id===booking.id),'PENDING_IN_AGENDA');});
 await step('foreign_tenant_cannot_decide',async()=>{await call(other,'post',`/booking/requests/${booking.id}/accept`,{},404);});
 await step('professional_inbox_filters_other_items_and_contacts',async()=>{const inbox=await call(professional,'get','/booking/requests');const mine=inbox.find(r=>r.id===booking.id);must(mine.items.length===1&&!('phone'in mine.customer)&&!('email'in mine.customer),'PROFESSIONAL_LEAK');});
 await step('professional_cannot_accept',async()=>{await call(professional,'post',`/booking/requests/${booking.id}/accept`,{},403);});
 await step('owner_accepts_request',async()=>{const accepted=await call(owner,'post',`/booking/requests/${booking.id}/accept`,{},201);must(accepted.status==='CONFIRMED','NOT_CONFIRMED');});
 await step('confirmation_updates_agenda_and_isolates_tenants',async()=>{const agenda=await call(owner,'get',`/booking/agenda?date=${day}`),foreign=await call(other,'get',`/booking/agenda?date=${day}`),mine=await call(professional,'get',`/booking/agenda?date=${day}`);must(agenda.items.filter(i=>i.request.id===booking.id).length===2,'OWNER_AGENDA');must(mine.items.filter(i=>i.request.id===booking.id).length===1,'PROF_AGENDA');must(!foreign.items.some(i=>i.request.id===booking.id),'TENANT_LEAK');});
 await step('notification_persisted_with_safe_panel_link',async()=>{const inbox=await call(owner,'get','/notifications');must(inbox.items.some(n=>n.title==='Nova solicitação de agendamento'&&n.actionUrl==='/painel/proprietario'),'NOTIFICATION_MISSING');});
 }
 if(process.env.QA_BOOKING_BROWSER==='1'){
  const browser=await chromium.launch({headless:true});
  try{
   for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
    const c=await browser.newContext({viewport,storageState:await owner.storageState()});
    const page=await c.newPage();await page.goto(origin+'/painel/proprietario');await page.getByRole('heading',{name:'Agenda interna',exact:true}).waitFor();
    await page.getByLabel('Dia da agenda',{exact:true}).fill(day);
    await page.locator('.k-agenda-list').getByText('QA Corte',{exact:true}).first().waitFor();
    must(await page.locator('.k-agenda-list').getByText('QA Booking Client',{exact:false}).count()>=2,'BROWSER_AGENDA_MISSING');
    must(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'HORIZONTAL_OVERFLOW');
    await page.screenshot({path:`/tmp/kalend-booking-dev-${viewport.width}.png`,fullPage:true});await c.close();results.push({name:`browser_agenda_${viewport.width}`,status:'PASS'});
   }
  }finally{await browser.close();}
 }
 fixture.lastBookingId=booking.id;fixture.day=day;writeFileSync(process.env.QA_BOOKING_FIXTURE,JSON.stringify(fixture,null,2),{mode:0o600});
}catch(error){results.push({name:'booking_dev',status:'FAIL',code:error instanceof Error?error.message:'UNKNOWN'});process.exitCode=1;}
finally{for(const c of contexts){await c.post(api+'/auth/logout').catch(()=>{});await c.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
