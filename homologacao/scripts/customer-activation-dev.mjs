/** Real DEV activation journey. Capability/password never printed or versioned. */
import { chromium, request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
process.umask(0o077);
const p=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')),f=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
if(p.api!=='https://api-dev.kalend.tech'||p.web!=='https://dev.kalend.tech'||f.database!=='kalend_dev'||f.companies.some(c=>!c.slug.startsWith('qa-booking-')))throw Error('DEV_QA_REQUIRED');
const contexts=[],results=[];let browser;
function must(v,code){if(!v)throw Error(code);}
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});must(r.status()===status,`HTTP_${m}_${path.split('?')[0]}_${r.status()}_EXPECTED_${status}`);return status===204?null:r.json();}
async function login(role,company){const a=p.accounts.find(a=>a.role===role);const c=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(c);await call(c,'post','/auth/login',{email:a.email,password:a.password});await call(c,'post','/auth/tenant',{companyId:company.id});return c;}
try{
 const A=f.companies.find(c=>c.label==='A'),B=f.companies.find(c=>c.label==='B');
 const owner=await login('OWNER_A',A),other=await login('OWNER_B',B),professional=await login('PROFESSIONAL_A',A);
 const customers=await call(owner,'get','/booking/customers');
 const customer=customers.find(c=>c.name==='QA Booking Client'&&!c.userId);must(customer&&customer.email.endsWith('@qa.kalend.invalid'),'UNACTIVATED_QA_CUSTOMER_REQUIRED');
 await call(other,'post',`/booking/customers/${customer.id}/invitation`,{},404);await call(professional,'post',`/booking/customers/${customer.id}/invitation`,{},403);
 results.push({name:'invitation_company_and_role_isolation',status:'PASS'});
 const invitation=await call(owner,'post',`/booking/customers/${customer.id}/invitation`,{},201);
 const password='QA!'+randomBytes(20).toString('hex');
 f.activatedClient={email:customer.email,password};writeFileSync(process.env.QA_BOOKING_FIXTURE,JSON.stringify(f,null,2),{mode:0o600});
 browser=await chromium.launch({headless:true});const c=await browser.newContext({viewport:{width:390,height:844}}),page=await c.newPage();
 await page.goto(`${p.web}/ativar-cliente#token=${invitation.token}`);
 await page.getByRole('heading',{name:'Ative sua área do cliente',exact:true}).waitFor();
 must(!page.url().includes(invitation.token),'TOKEN_RETAINED_IN_HISTORY');
 await page.getByLabel('E-mail',{exact:true}).fill(customer.email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Ativar meu acesso',exact:true}).click();
 await page.getByRole('heading',{name:'Acesso ativado',exact:true}).waitFor();results.push({name:'anonymous_mobile_activation_with_single_use_capability',status:'PASS'});
 const anon=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(anon);
 await call(anon,'post','/public/booking/activate',{token:invitation.token,email:customer.email,password,termsAccepted:true},400);results.push({name:'consumed_capability_replay_rejected',status:'PASS'});
 const client=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(client);
 await call(client,'post','/auth/login',{email:customer.email,password});await call(client,'post','/auth/tenant',{companyId:A.id});
 const me=await call(client,'get','/auth/me');must(me.memberships.length===1&&me.memberships[0].role==='CLIENT'&&!me.user.isSuperAdmin,'ACTIVATION_ROLE_ESCALATION');
 const mine=await call(client,'get','/booking/my-requests');must(mine.requests.some(r=>r.id===f.lastBookingId),'CLIENT_REQUEST_MISSING');
 await call(client,'get','/booking/requests',undefined,403);await call(client,'get','/booking/customers',undefined,403);await call(client,'post','/auth/tenant',{companyId:B.id},403);
 results.push({name:'client_login_own_history_and_forbidden_staff_other_tenant',status:'PASS'});
 const clientBrowser=await browser.newContext({viewport:{width:390,height:844},storageState:await client.storageState()}),clientPage=await clientBrowser.newPage();await clientPage.goto(p.web+'/painel/cliente');await clientPage.getByRole('heading',{name:'Meus agendamentos',exact:true}).waitFor();await clientPage.getByText('QA Corte',{exact:true}).first().waitFor();must(await clientPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'CLIENT_MOBILE_OVERFLOW');
 await clientPage.screenshot({path:'/tmp/kalend-client-panel-mobile.png',fullPage:true});results.push({name:'mobile_client_panel_persisted_bookings',status:'PASS'});
 const publicContext=await browser.newContext({viewport:{width:390,height:844}}),publicPage=await publicContext.newPage();await publicPage.goto(`${p.web}/agendar/${A.slug}`);await publicPage.getByRole('heading',{name:'Escolha seus serviços',exact:true}).waitFor();await publicPage.waitForTimeout(1500);must(new URL(publicPage.url()).pathname===`/agendar/${A.slug}`,'ANONYMOUS_BOOKING_REDIRECT');must(await publicPage.getByText('QA Proprietário',{exact:false}).count()>0,'PUBLIC_PROFESSIONAL_NAME_MISSING');results.push({name:'anonymous_public_catalog_preserved_and_professional_names_visible',status:'PASS'});
}catch(error){results.push({name:'client_activation_dev',status:'FAIL',code:error instanceof Error?error.message:'UNKNOWN'});process.exitCode=1;}
finally{await browser?.close();for(const c of contexts){await c.post(p.api+'/auth/logout').catch(()=>{});await c.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
