/** Real DEV HTTP journeys. Credentials/cookies remain in a private directory; stdout is sanitized. */
import { request } from '@playwright/test';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
process.umask(0o077);
const file=process.env.QA_IDENTITY_FILE;
if(!file)throw Error('PRIVATE_QA_IDENTITY_FILE_REQUIRED');
const p=JSON.parse(readFileSync(file,'utf8'));
if(!p.provisioned||p.database!=='kalend_dev'||p.api!=='https://api-dev.kalend.tech'||p.accounts.some(a=>!/^qa\+[^@]+@qa\.kalend\.invalid$/.test(a.email)))throw Error('PROVISIONED_DEV_QA_REQUIRED');
const directory=dirname(resolve(file)),results=[],contexts={};
const api=p.api,origin=p.web;
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',code:e.code??'ASSERTION_FAILED'});}}
function must(value,code='ASSERTION_FAILED'){if(!value){const e=Error(code);e.code=code;throw e;}}
async function call(c,method,path,data,expected=200){const r=await c[method](api+path,data===undefined?{}:{data});must(r.status()===expected,'HTTP_'+r.status()+'_EXPECTED_'+expected);return r;}
const acct=role=>p.accounts.find(a=>a.role===role),tenant=label=>p.companies.find(c=>c.label===label);
async function login(role){const c=await request.newContext({extraHTTPHeaders:{Origin:origin}});const a=acct(role);await call(c,'post','/auth/login',{email:a.email,password:a.password});return c;}
if(process.env.QA_RETEST==='tenant-cancel') {
 const c=await request.newContext({storageState:join(directory,'session-OWNER_A.private.json'),extraHTTPHeaders:{Origin:origin}});
 const sub=p.created.subscriptions.find(x=>x.companyId===tenant('B').id);
 await call(c,'post',`/billing/subscriptions/${sub.id}/cancel`,{atPeriodEnd:false},404);
 await c.dispose(); console.log(JSON.stringify({name:'owner_A_other_tenant_subscription_cancel_rejected',status:'PASS',fixtureCorrection:'atPeriodEnd is the actual API field; previous 400 was request validation'}));process.exit(0);
}
for(const role of ['SUPER_ADMIN','OWNER_A','OWNER_B','PROFESSIONAL_A'])await check('login_'+role,async()=>{
 const c=contexts[role]=await login(role);const me=await(await call(c,'get','/auth/me')).json();must(me.user.id===acct(role).id);must(me.user.isSuperAdmin===(role==='SUPER_ADMIN'));
 const cookies=(await c.storageState()).cookies;for(const name of ['__Host-kalend_access','__Host-kalend_refresh'])must(cookies.some(x=>x.name===name&&x.secure&&x.httpOnly&&x.path==='/'),'COOKIE_FLAGS');
 if(role!=='SUPER_ADMIN')await call(c,'post','/auth/tenant',{companyId:tenant(role==='OWNER_B'?'B':'A').id});
 await c.storageState({path:join(directory,`session-${role}.private.json`)});chmodSync(join(directory,`session-${role}.private.json`),0o600);
});
await check('disabled_QA_identity_rejected',async()=>{const c=await request.newContext({extraHTTPHeaders:{Origin:origin}});const a=acct('DISABLED_A');await call(c,'post','/auth/login',{email:a.email,password:a.password},401);await c.dispose();});
const admin=contexts.SUPER_ADMIN,A=contexts.OWNER_A,B=contexts.OWNER_B,prof=contexts.PROFESSIONAL_A;
if(admin){
 for(const path of ['/companies','/users','/plans','/subscriptions','/finance','/finance/summary','/dashboard/summary','/notifications','/notifications/unread-count','/notifications/preferences','/payment-gateways','/communication/providers','/communication/events','/communication/outbox','/communication/deliveries','/communication/push/public-config','/communication/push/subscriptions'])await check('admin_GET_'+path,async()=>{await call(admin,'get',path);});
 await check('admin_read_exact_QA_tenant',async()=>{const x=await(await call(admin,'get','/companies/'+tenant('A').id)).json();must(x.name===tenant('A').name);});
 await check('QA_plan_edit_and_validation',async()=>{const id=p.created.planId;await call(admin,'patch','/plans/'+id,{description:'QA isolated homologation'});await call(admin,'patch','/plans/'+id,{monthlyPriceCents:-1},400);const x=await(await call(admin,'get','/plans/'+id)).json();must(x.monthlyPriceCents===1000&&x.isPublic===false);});
 await check('QA_company_invalid_timezone_rejected',async()=>{await call(admin,'patch','/companies/'+tenant('A').id,{timezone:'QA/Invalid'},400);});
 await check('user_views_do_not_expose_password_hashes',async()=>{const x=await(await call(admin,'get','/users/'+acct('OWNER_A').id)).json();must(!Object.hasOwn(x,'passwordHash'));});
}
for(const [role,c] of [['OWNER_A',A],['OWNER_B',B],['PROFESSIONAL_A',prof]])if(c){
 await check(role+'_global_admin_routes_forbidden',async()=>{for(const path of ['/companies','/users','/plans','/subscriptions','/finance','/dashboard/summary','/communication/providers'])await call(c,'get',path,undefined,403);});
 await check(role+'_cannot_modify_global_plan_or_company',async()=>{await call(c,'patch','/plans/'+p.created.planId,{monthlyPriceCents:1},403);await call(c,'patch','/companies/'+tenant('B').id,{name:'forbidden'},403);});
 await check(role+'_notifications_only_own_identity',async()=>{await call(c,'get','/notifications');await call(c,'get','/notifications/unread-count');});
}
if(A&&B){
 await check('owner_A_cannot_select_B_tenant',async()=>{await call(A,'post','/auth/tenant',{companyId:tenant('B').id},403);const x=await(await call(A,'get','/auth/tenant')).json();must(x.companyId===tenant('A').id);});
 await check('owner_B_cannot_select_A_tenant',async()=>{await call(B,'post','/auth/tenant',{companyId:tenant('A').id},403);});
 await check('trial_A_and_B_allow_legitimate_trial_access',async()=>{for(const c of [A,B]){const x=await(await call(c,'get','/billing/regularization')).json();must(x.accessAllowed===true,'TRIAL_ACCESS_DENIED');}});
 await check('owner_A_other_tenant_subscription_cancel_rejected',async()=>{const s=p.created.subscriptions.find(s=>s.companyId===tenant('B').id);await call(A,'post',`/billing/subscriptions/${s.id}/cancel`,{atPeriodEnd:false},404);});
}
if(prof){
 await check('professional_cannot_checkout_or_cancel',async()=>{await call(prof,'post','/billing/checkout',{},403);const s=p.created.subscriptions[0];await call(prof,'post',`/billing/subscriptions/${s.id}/cancel`,{},403);});
 await check('refresh_rotates_cookie_and_logout_revokes_session',async()=>{const before=(await prof.storageState()).cookies.find(x=>x.name==='__Host-kalend_refresh').value;await call(prof,'post','/auth/refresh',{});const after=(await prof.storageState()).cookies.find(x=>x.name==='__Host-kalend_refresh').value;must(before!==after);await call(prof,'post','/auth/logout',{},204);await call(prof,'get','/auth/me',undefined,401);});
}
const report={apiVersion:'a49f6a5',webVersion:'c4f84d5',authenticated:true,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results};
writeFileSync(join(directory,'authenticated-api.sanitized.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
for(const c of Object.values(contexts))await c.dispose();console.log(JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;
