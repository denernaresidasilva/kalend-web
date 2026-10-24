import { request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const file=process.env.QA_IDENTITY_FILE,p=JSON.parse(readFileSync(file,'utf8')),dir=dirname(file),results=[];
if(!p.provisioned||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE');
const admin=await request.newContext({storageState:join(dir,'session-SUPER_ADMIN.private.json'),extraHTTPHeaders:{Origin:p.web}});
const owner=await request.newContext({storageState:join(dir,'session-OWNER_B.private.json'),extraHTTPHeaders:{Origin:p.web}});
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});if(r.status()!==status){writeFileSync(join(dir,'checkout-error.private.json'),JSON.stringify({path,status:r.status(),body:await r.text()}),{mode:0o600});const e=Error('HTTP');e.code=`HTTP_${r.status()}_EXPECTED_${status}`;throw e;}return r;}
for(const c of [admin,owner])if((await c.get(p.api+'/auth/me')).status()===401)await call(c,'post','/auth/refresh',{});
async function step(name,fn){try{const x=await fn();results.push({name,status:'PASS'});return x;}catch(e){results.push({name,status:'FAIL',code:e.code??'ASSERTION_FAILED'});throw e;}}
let planId,created;
try{
 const g=await(await call(admin,'get','/payment-gateways/PAGBANK')).json();if(g.environment!=='SANDBOX')throw Error('SANDBOX_REQUIRED');
 const plan=await step('QA_plan_creation_via_authenticated_API',async()=>(await call(admin,'post','/plans',{name:p.runId+'-Checkout',code:p.runId.toLowerCase()+'-checkout',monthlyPriceCents:1000,trialEnabled:true,trialDays:7,isActive:true,isPublic:true},201)).json());planId=plan.id;
 const a=p.accounts.find(a=>a.role==='OWNER_B');const body={companyName:p.runId+'-C',slug:p.runId.toLowerCase()+'-c',ownerName:a.name,ownerEmail:a.email,ownerPassword:a.password,planId,startWithTrial:true};
 created=await step('QA_company_creation_with_existing_QA_owner',async()=>(await call(admin,'post','/companies/manual',body,201)).json());
 await step('duplicate_QA_company_slug_rejected',()=>call(admin,'post','/companies/manual',body,409));
 p.extraCheckoutFixture={companyId:created.company.id,subscriptionId:created.subscription.id,planId};writeFileSync(file,JSON.stringify(p,null,2)+'\n',{mode:0o600});
 await step('same_QA_owner_can_select_second_authorized_tenant',()=>call(owner,'post','/auth/tenant',{companyId:created.company.id}));
 const key=randomUUID();
 const checkout=await step('actual_PagBank_SANDBOX_checkout',async()=>(await call(owner,'post','/billing/checkout',{planId,gateway:'PAGBANK',billingInterval:'MONTHLY',idempotencyKey:key,recurring:false},201)).json());
 writeFileSync(join(dir,'checkout-result.private.json'),JSON.stringify(checkout),{mode:0o600});
 await step('checkout_same_key_is_idempotent',async()=>{const again=await(await call(owner,'post','/billing/checkout',{planId,gateway:'PAGBANK',billingInterval:'MONTHLY',idempotencyKey:key,recurring:false},201)).json();if(again.id!==checkout.id)throw Error('DUPLICATE_CHECKOUT');});
}catch{ /* preserve failure evidence, no second external attempt */ }
finally{
 if(planId)await call(admin,'patch','/plans/'+planId,{isPublic:false});
 await step('unverified_PagBank_webhook_rejected',async()=>{const r=await admin.post(p.api+'/webhooks/pagbank',{headers:{'x-authenticity-token':'qa-invalid-signature'},data:{id:'QA-'+randomUUID()}});if(![400,401,403].includes(r.status()))throw Error('UNVERIFIED_WEBHOOK_ACCEPTED');});
 await admin.storageState({path:join(dir,'session-SUPER_ADMIN.private.json')});await owner.storageState({path:join(dir,'session-OWNER_B.private.json')});await admin.dispose();await owner.dispose();
 const report={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results};writeFileSync(join(dir,'checkout.sanitized.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
}
