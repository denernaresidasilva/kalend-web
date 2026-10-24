/** Mutates only the newly provisioned QA professional and QA inbox/preferences. */
import {request} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
process.umask(0o077);
const file=process.env.QA_IDENTITY_FILE,p=JSON.parse(readFileSync(file,'utf8'));
if(!p.provisioned||p.database!=='kalend_dev'||p.api!=='https://api-dev.kalend.tech'||!p.runId.startsWith('QA-E2E-SA-'))throw Error('QA_SCOPE');
const results=[],contexts=[];const account=r=>p.accounts.find(a=>a.role===r),company=l=>p.companies.find(c=>c.label===l);
function must(v){if(!v)throw Error('ASSERTION');}
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});if(r.status()!==status)throw Error('HTTP_'+r.status()+'_EXPECTED_'+status);return r;}
async function login(role){const c=await request.newContext({extraHTTPHeaders:{Origin:p.web}});contexts.push(c);const a=account(role);await call(c,'post','/auth/login',{email:a.email,password:a.password});return c;}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',code:e.message});}}
const admin=await login('SUPER_ADMIN'),A=await login('OWNER_A'),B=await login('OWNER_B');
await call(A,'post','/auth/tenant',{companyId:company('A').id});await call(B,'post','/auth/tenant',{companyId:company('B').id});
await check('notification_read_IDOR_and_idempotence',async()=>{const inbox=await(await call(B,'get','/notifications?filter=unread')).json();must(inbox.items.length>0);const id=inbox.items[0].id;await call(A,'post',`/notifications/${id}/read`,{},404);const count=await(await call(B,'get','/notifications/unread-count')).json();must((await(await call(B,'post',`/notifications/${id}/read`,{},201)).json()).updated===1);must((await(await call(B,'post',`/notifications/${id}/read`,{},201)).json()).updated===0);must((await(await call(B,'get','/notifications/unread-count')).json()).unreadCount===count.unreadCount-1);});
await check('QA_notification_preferences_roundtrip',async()=>{const previous=await(await call(B,'get','/notifications/preferences')).json();try{must((await(await call(B,'put','/notifications/preferences',{inSystemEnabled:false})).json()).inSystemEnabled===false);}finally{await call(B,'put','/notifications/preferences',previous);}});
await check('cannot_disable_QA_super_admin',async()=>{await call(admin,'patch','/users/'+account('SUPER_ADMIN').id,{isActive:false},403);});
await check('QA_user_deactivation_revokes_existing_session',async()=>{const id=account('PROFESSIONAL_A').id;await call(admin,'patch','/users/'+id,{isActive:true,memberships:[{companyId:company('B').id,role:'PROFESSIONAL',isActive:true}]});const prof=await login('PROFESSIONAL_A');await call(prof,'get','/auth/me');try{await call(admin,'patch','/users/'+id,{isActive:false});await call(prof,'get','/auth/me',undefined,401);const a=account('PROFESSIONAL_A');await call(prof,'post','/auth/login',{email:a.email,password:a.password},401);}finally{await call(admin,'patch','/users/'+id,{isActive:true});}await call(prof,'get','/auth/me',undefined,401);const fresh=await login('PROFESSIONAL_A');await call(fresh,'get','/auth/me');});
await check('QA_logout_all_revokes_two_independent_sessions',async()=>{const one=await login('PROFESSIONAL_A'),two=await login('PROFESSIONAL_A');await call(one,'post','/auth/logout-all',{},204);await call(one,'get','/auth/me',undefined,401);await call(two,'get','/auth/me',undefined,401);});
for(const c of contexts)await c.dispose();const report={results,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};writeFileSync(join(dirname(file),'notification-revocation.sanitized.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=report.failed?1:0;
