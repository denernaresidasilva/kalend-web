import {request} from '@playwright/test';import{readFileSync,writeFileSync}from'node:fs';import{dirname,join}from'node:path';import{randomUUID}from'node:crypto';
process.umask(0o077);const file=process.env.QA_IDENTITY_FILE,p=JSON.parse(readFileSync(file,'utf8')),dir=dirname(file),stage=process.env.QA_STAGE;
if(!p.provisioned||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE');
const ledger=JSON.parse(readFileSync(join(dir,'financial-ledger.private.json'),'utf8')),results=[];
const contexts={};for(const role of ['SUPER_ADMIN','OWNER_A','OWNER_B']){const c=contexts[role]=await request.newContext({storageState:join(dir,`session-${role}.private.json`),extraHTTPHeaders:{Origin:p.web}});if((await c.get(p.api+'/auth/me')).status()===401){const a=p.accounts.find(a=>a.role===role);const r=await c.post(p.api+'/auth/login',{data:{email:a.email,password:a.password}});if(r.status()!==200)throw Error('QA_LOGIN_REQUIRED');if(role!=='SUPER_ADMIN')await c.post(p.api+'/auth/tenant',{data:{companyId:p.companies.find(x=>x.label===(role==='OWNER_B'?'B':'A')).id}});}}
const admin=contexts.SUPER_ADMIN,A=contexts.OWNER_A,B=contexts.OWNER_B;
function must(v,code='ASSERTION_FAILED'){if(!v){const e=Error(code);e.code=code;throw e;}}
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});must(r.status()===status,`HTTP_${r.status()}_EXPECTED_${status}`);return r;}
async function step(name,fn){try{const x=await fn();results.push({name,status:'PASS'});return x;}catch(e){results.push({name,status:'FAIL',code:e.code??'ASSERTION_FAILED'});throw e;}}
const state=async c=>(await call(c,'get','/billing/regularization')).json();
const sim=async(companyId,action,rest={})=>(await call(admin,'post','/billing/qa-simulation',{companyId,action,...rest},201)).json();
const aId=p.companies.find(c=>c.label==='A').id,bId=p.companies.find(c=>c.label==='B').id;
try{
 if(stage==='grace'){
  await call(B,'post','/auth/tenant',{companyId:bId});
  await step('historical_expired_paid_period_does_not_unlock_before_grace',async()=>must((await state(B)).accessAllowed===false));
  await step('legitimate_grace_uses_preexisting_paid_evidence',async()=>{await sim(bId,'SUBSCRIPTION_GRACE_PERIOD',{paymentId:ledger.B_HIST.paymentId,graceDays:7});const x=await state(B);must(x.accessAllowed===true&&x.accessStatus==='PAST_DUE','LEGITIMATE_GRACE');});
  await step('grace_deadline_is_anchored_and_duplicate_does_not_extend',async()=>{const path='/subscriptions/'+ledger.B_HIST.subscriptionId,before=await(await call(admin,'get',path)).json();must(Date.parse(before.graceEndsAt)-Date.parse(before.currentPeriodEnd)===7*86400000);const r=await sim(bId,'SUBSCRIPTION_GRACE_PERIOD',{paymentId:ledger.B_HIST.paymentId,graceDays:7});must(r.duplicate===true);const after=await(await call(admin,'get',path)).json();must(before.graceEndsAt===after.graceEndsAt);});
  ledger.B_NEW=await step('recovery_payment_reuses_rightful_subscription',()=>sim(bId,'PAYMENT_PENDING',{subscriptionId:ledger.B_HIST.subscriptionId,idempotencyKey:randomUUID()}));
  await step('recovery_approval_restores_active_paid_access',async()=>{await sim(bId,'PAYMENT_APPROVED',{paymentId:ledger.B_NEW.paymentId});must((await state(B)).accessAllowed===true);});
 }
 if(stage==='partial'||stage==='full'||stage==='chargeback'){
  await call(A,'post','/auth/tenant',{companyId:aId});const key=stage==='chargeback'?'A_NEW':'A';
  await step(stage+'_refund_or_reversal_state_visible_through_authenticated_API',async()=>{const x=await(await call(A,'get','/billing/payments/'+ledger[key].paymentId)).json();if(stage==='partial')must(x.status==='APPROVED'&&x.refundedAmountCents>0&&x.refundedAmountCents<x.amountCents);if(stage==='full')must(x.status==='REFUNDED'&&x.refundedAmountCents===x.amountCents);if(stage==='chargeback')must(x.status==='FAILED');must((await state(A)).accessAllowed===(stage==='partial'));});
 }
 if(stage==='recover'){
  ledger.A_NEW=await step('new_payment_after_full_refund_is_not_reapproval_of_reversed_money',()=>sim(aId,'PAYMENT_PENDING',{subscriptionId:ledger.A.subscriptionId,idempotencyKey:randomUUID()}));
  await step('new_legitimate_approval_restores_access_after_refund',async()=>{await sim(aId,'PAYMENT_APPROVED',{paymentId:ledger.A_NEW.paymentId});must((await state(A)).accessAllowed===true);});
 }
 if(stage==='cancel'){
  const checkout=JSON.parse(readFileSync(join(dir,'checkout-result.private.json'),'utf8'));
  await call(B,'post','/auth/tenant',{companyId:p.extraCheckoutFixture.companyId});
  await step('sandbox_pending_contract_cancel_is_authenticated_and_scoped',()=>call(B,'post',`/billing/subscriptions/${checkout.subscriptionId}/cancel`,{atPeriodEnd:false},201));
  await step('cancel_does_not_destroy_unrelated_valid_trial',async()=>must((await state(B)).accessAllowed===true));
  await step('trial_cancellation_blocks_only_that_QA_company',async()=>{await call(B,'post',`/billing/subscriptions/${p.extraCheckoutFixture.subscriptionId}/cancel`,{atPeriodEnd:false},201);must((await state(B)).accessAllowed===false);});
  await step('duplicate_cancel_is_idempotent',()=>call(B,'post',`/billing/subscriptions/${p.extraCheckoutFixture.subscriptionId}/cancel`,{atPeriodEnd:false},201));
 }
}catch{}
writeFileSync(join(dir,'financial-ledger.private.json'),JSON.stringify(ledger,null,2)+'\n',{mode:0o600});
for(const [role,c] of Object.entries(contexts)){await c.storageState({path:join(dir,`session-${role}.private.json`)});await c.dispose();}
const report={stage,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results};writeFileSync(join(dir,`lifecycle-${stage}.sanitized.json`),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
