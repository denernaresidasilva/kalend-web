/** Complete anonymous browser journey against real DEV persistence. */
import { chromium, request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const p=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')),f=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
if(p.api!=='https://api-dev.kalend.tech'||p.web!=='https://dev.kalend.tech'||f.database!=='kalend_dev'||!f.companies.every(c=>c.slug.startsWith('qa-booking-')))throw Error('DEV_QA_REQUIRED');
const results=[];let browser,owner;
function must(value,code){if(!value)throw Error(code);}
try{
 const A=f.companies.find(c=>c.label==='A'),account=p.accounts.find(a=>a.role==='OWNER_A');
 owner=await request.newContext({extraHTTPHeaders:{Origin:p.web}});must((await owner.post(p.api+'/auth/login',{data:{email:account.email,password:account.password}})).ok(),'OWNER_LOGIN');must((await owner.post(p.api+'/auth/tenant',{data:{companyId:A.id}})).ok(),'OWNER_TENANT');
 browser=await chromium.launch({headless:true});const c=await browser.newContext({viewport:{width:390,height:844}}),page=await c.newPage();await page.goto(`${p.web}/agendar/${A.slug}`);
 await page.getByRole('heading',{name:'Escolha seus serviços',exact:true}).waitFor();
 const day=new Date(Date.now()+9*86400000).toISOString().slice(0,10);
 const choose=async(proName)=>{
  await page.locator('article').filter({has:page.getByRole('heading',{name:'QA Corte',exact:true})}).getByRole('button',{name:'Escolher horário',exact:true}).click();
  await page.getByLabel('Data',{exact:true}).fill(day);
  // Choose the innermost professional section rather than catalog ancestors.
  const professional=page.getByRole('heading',{name:proName,exact:true}).locator('..');
  await professional.locator('button:enabled').first().click();
 };
 await choose('QA Proprietário');await choose('QA Profissional');
 must(await page.locator('aside').getByRole('listitem').count()===2,'MULTI_SERVICE_CART');results.push({name:'anonymous_catalog_professionals_slots_and_multi_service_cart',status:'PASS'});
 await page.getByRole('button',{name:'Solicitar agendamento',exact:true}).click();const marker=randomUUID(),name='QA Browser '+marker.slice(0,8);
 await page.getByLabel('Nome completo',{exact:true}).fill(name);await page.getByLabel('E-mail',{exact:true}).fill(`${marker}@qa.kalend.invalid`);await page.getByLabel('WhatsApp',{exact:true}).fill('+55119'+String(Math.floor(Math.random()*1e8)).padStart(8,'0'));await page.getByRole('checkbox',{name:/Li e aceito/}).check();
 const responsePromise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/public/booking/')&&r.url().endsWith('/requests'));
 await page.getByRole('button',{name:'Enviar solicitação',exact:true}).click();const response=await responsePromise;must(response.status()===201,'PUBLIC_REQUEST_NOT_CREATED');const booking=await response.json();
 await page.getByRole('heading',{name:'Solicitação enviada com sucesso!',exact:true}).waitFor();must(booking.items.length===2,'BOOKING_ITEM_COUNT');results.push({name:'public_browser_customer_identification_and_request_persisted',status:'PASS'});
 const inbox=await(await owner.get(p.api+'/booking/requests')).json();must(inbox.some(r=>r.id===booking.id&&r.customer.name===name),'INBOX_MISSING');
 must((await owner.post(`${p.api}/booking/requests/${booking.id}/accept`,{data:{}})).status()===201,'APPROVAL_FAILED');
 const agenda=await(await owner.get(`${p.api}/booking/agenda?date=${day}`)).json();must(agenda.items.filter(i=>i.request.id===booking.id).length===2,'CONFIRMED_AGENDA_MISSING');results.push({name:'establishment_acceptance_updates_real_agenda',status:'PASS'});
 must(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'PUBLIC_MOBILE_OVERFLOW');await page.screenshot({path:'/tmp/kalend-public-booking-success-mobile.png',fullPage:true});
}catch(e){results.push({name:'public_booking_browser',status:'FAIL',code:e instanceof Error?e.message:'UNKNOWN'});process.exitCode=1;}
finally{await browser?.close();if(owner){await owner.post(p.api+'/auth/logout').catch(()=>{});await owner.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
