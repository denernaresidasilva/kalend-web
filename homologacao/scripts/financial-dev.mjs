/** DEV-only authenticated commercial journeys; QA_SIMULATION except one explicitly SANDBOX checkout. */
import { request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const file=process.env.QA_IDENTITY_FILE;if(!file)throw Error('QA_FILE_REQUIRED');const p=JSON.parse(readFileSync(file,'utf8'));
if(!p.provisioned||p.database!=='kalend_dev'||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE_REQUIRED');
const resume=process.env.QA_CONTINUE==='true';const dir=dirname(file),results=[],ledger=resume?JSON.parse(readFileSync(join(dirname(file),'financial-ledger.private.json'),'utf8')):{};let oldOwnerSessionRevoked=false;const A=p.companies.find(c=>c.label==='A').id,B=p.companies.find(c=>c.label==='B').id;
const contexts={};
function must(v,code='ASSERTION_FAILED'){if(!v){const e=Error(code);e.code=code;throw e;}}
async function call(c,method,path,data,status=200){const r=await c[method](p.api+path,data===undefined?{}:{data});if(r.status()!==status){writeFileSync(join(dir,'last-financial-error.private.json'),JSON.stringify({path,status:r.status(),body:await r.text()}),{mode:0o600});must(false,'HTTP_'+r.status()+'_EXPECTED_'+status);}return r;}
async function step(name,fn){try{const result=await fn();results.push({name,status:'PASS'});return result;}catch(e){results.push({name,status:'FAIL',code:e.code??'ASSERTION_FAILED'});throw e;}}
for(const role of ['SUPER_ADMIN','OWNER_A','OWNER_B']){
 const c=contexts[role]=await request.newContext({storageState:join(dir,`session-${role}.private.json`),extraHTTPHeaders:{Origin:p.web}});
 if((await c.get(p.api+'/auth/me')).status()===401){if(resume&&role==='OWNER_A'){oldOwnerSessionRevoked=true;const a=p.accounts.find(a=>a.role===role);await call(c,'post','/auth/login',{email:a.email,password:a.password});await call(c,'post','/auth/tenant',{companyId:A});}else await call(c,'post','/auth/refresh',{});}
}
const admin=contexts.SUPER_ADMIN,ownerA=contexts.OWNER_A,ownerB=contexts.OWNER_B;
const state=async c=>(await call(c,'get','/billing/regularization')).json();
const sim=async(companyId,action,more={})=>(await call(admin,'post','/billing/qa-simulation',{companyId,action,...more},201)).json();
try{
 if(!resume){
 await step('expired_trial_blocks_A_and_B_without_paid_right',async()=>{for(const c of [ownerA,ownerB]){const s=await state(c);must(s.accessAllowed===false);must(s.accessStatus==='TRIAL_EXPIRED','TRIAL_EXPIRY_STATUS');await call(c,'get','/auth/tenant',undefined,403);}});
 ledger.B=await step('first_pending_payment_is_QA_only',()=>sim(B,'PAYMENT_PENDING',{planId:p.created.planId,billingInterval:'MONTHLY',idempotencyKey:randomUUID()}));
 await step('first_pending_never_unlocks_paid_access',async()=>must((await state(ownerB)).accessAllowed===false));
 await step('first_overdue_does_not_grant_grace',async()=>{await sim(B,'PAYMENT_OVERDUE',{paymentId:ledger.B.paymentId,graceDays:7});must((await state(ownerB)).accessAllowed===false);});
 await step('administrative_enablement_does_not_grant_paid_access',async()=>{await call(admin,'patch','/companies/'+B,{status:'ACTIVE'});must((await state(ownerB)).accessAllowed===false);});
 await step('illegitimate_grace_is_rejected',async()=>{await call(admin,'post','/billing/qa-simulation',{companyId:B,action:'SUBSCRIPTION_GRACE_PERIOD',paymentId:ledger.B.paymentId,graceDays:7},409);must((await state(ownerB)).accessAllowed===false);});
 await step('payment_failed_remains_blocked',async()=>{await sim(B,'PAYMENT_FAILED',{paymentId:ledger.B.paymentId,graceDays:7});must((await state(ownerB)).accessAllowed===false);});
 await step('paid_reactivation_without_approval_is_rejected',async()=>{await call(admin,'post','/billing/qa-simulation',{companyId:B,action:'SUBSCRIPTION_REACTIVATED',paymentId:ledger.B.paymentId},409);});
 await step('owner_A_cannot_read_B_payment',async()=>{await call(ownerA,'get','/billing/payments/'+ledger.B.paymentId,undefined,404);});
 ledger.A=await step('A_pending_simulation_created',()=>sim(A,'PAYMENT_PENDING',{planId:p.created.planId,billingInterval:'MONTHLY',idempotencyKey:randomUUID()}));
 await step('approval_grants_legitimate_paid_access',async()=>{await sim(A,'PAYMENT_APPROVED',{paymentId:ledger.A.paymentId});must((await state(ownerA)).accessAllowed===true);});
 await step('duplicate_approval_is_idempotent',async()=>{const x=await sim(A,'PAYMENT_APPROVED',{paymentId:ledger.A.paymentId});must(x.duplicate===true);});
 await step('late_failure_cannot_reverse_approved_payment',async()=>{await call(admin,'post','/billing/qa-simulation',{companyId:A,action:'PAYMENT_FAILED',paymentId:ledger.A.paymentId},409);must((await state(ownerA)).accessAllowed===true);});
 await step('suspension_blocks_access',async()=>{await sim(A,'SUBSCRIPTION_SUSPENDED',{paymentId:ledger.A.paymentId});must((await state(ownerA)).accessAllowed===false);});
 await step('reactivation_requires_and_preserves_paid_proof',async()=>{await sim(A,'SUBSCRIPTION_REACTIVATED',{paymentId:ledger.A.paymentId});must((await state(ownerA)).accessAllowed===true);});
 await step('QA_administrative_block_and_recovery',async()=>{await call(admin,'patch','/companies/'+A,{administrativeStatus:'DISABLED'});await call(ownerA,'get','/billing/regularization',undefined,403);await call(admin,'patch','/companies/'+A,{administrativeStatus:'ACTIVE'});await call(ownerA,'get','/auth/me',undefined,401);const a=p.accounts.find(a=>a.role==='OWNER_A');await call(ownerA,'post','/auth/login',{email:a.email,password:a.password});await call(ownerA,'post','/auth/tenant',{companyId:A});must((await state(ownerA)).accessAllowed===true);});
 }else await step('administrative_recovery_requires_new_login',async()=>{must(oldOwnerSessionRevoked);must((await state(ownerA)).accessAllowed===true);});
 await step('sandbox_gateway_is_explicit_before_checkout',async()=>{const g=await(await call(admin,'get','/payment-gateways/PAGBANK')).json();must(g.environment==='SANDBOX'&&g.enabled===true,'SANDBOX_REQUIRED');});
 if(process.env.QA_ALLOW_CHECKOUT==='true')await step('private_QA_plan_cannot_enter_public_checkout',async()=>{const r=await call(ownerB,'post','/billing/checkout',{planId:p.created.planId,gateway:'PAGBANK',billingInterval:'MONTHLY',idempotencyKey:randomUUID(),recurring:false},404);must(r.status()===404,'PRIVATE_PLAN_EXPOSED');});
 await step('invalid_webhook_signature_is_rejected',async()=>{const r=await admin.post(p.api+'/webhooks/pagbank',{headers:{'x-authenticity-token':'qa-invalid-signature'},data:{id:'QA-'+randomUUID(),reference_id:ledger.A.paymentId}});must([400,401,403].includes(r.status()),'UNVERIFIED_WEBHOOK_ACCEPTED');});
} catch{ /* first failed financial dependency stops subsequent mutation */ }
for(const [role,c] of Object.entries(contexts)){await c.storageState({path:join(dir,`session-${role}.private.json`)});await c.dispose();}
writeFileSync(join(dir,'financial-ledger.private.json'),JSON.stringify(ledger,null,2)+'\n',{mode:0o600});
const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results,scope:'QA_SIMULATION; external checkout requires SANDBOX precondition; no real charge'};
writeFileSync(join(dir,'financial-api.sanitized.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
