import{request}from'@playwright/test';import{readFileSync,writeFileSync}from'node:fs';import{dirname,join}from'node:path';
process.umask(0o077);const file=process.env.QA_IDENTITY_FILE,p=JSON.parse(readFileSync(file,'utf8')),dir=dirname(file),stage=process.env.QA_STAGE,results=[];
if(!p.provisioned||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE');
const admin=await request.newContext({storageState:join(dir,'session-SUPER_ADMIN.private.json'),extraHTTPHeaders:{Origin:p.web}}),owner=await request.newContext({storageState:join(dir,'session-OWNER_A.private.json'),extraHTTPHeaders:{Origin:p.web}});
async function call(c,m,path,data,status=200){const r=await c[m](p.api+path,data===undefined?{}:{data});if(r.status()!==status){const e=Error('HTTP');e.code=`HTTP_${r.status()}_EXPECTED_${status}`;throw e;}return r;}
for(const c of [admin,owner])if((await c.get(p.api+'/auth/me')).status()===401)await call(c,'post','/auth/refresh',{});
async function step(name,fn){try{const x=await fn();results.push({name,status:'PASS'});return x;}catch(e){results.push({name,status:'FAIL',code:e.code??'ASSERTION_FAILED'});throw e;}}
try{
 if(stage==='prepare'){
  const a=p.accounts.find(a=>a.role==='OWNER_A');
  const x=await step('explicit_QA_ADMIN_GRANT_company_creation',async()=>(await call(admin,'post','/companies/manual',{companyName:p.runId+'-D',slug:p.runId.toLowerCase()+'-d',ownerName:a.name,ownerEmail:a.email,ownerPassword:a.password,planId:p.created.planId,startWithTrial:false,adminGraceDays:3},201)).json());
  p.extraGrantFixture={companyId:x.company.id,subscriptionId:x.subscription.id};
  await call(owner,'post','/auth/tenant',{companyId:x.company.id});
  await step('explicit_grant_allows_legitimate_access_without_fake_payment',async()=>{const s=await(await call(owner,'get','/billing/regularization')).json();if(!s.accessAllowed)throw Error('GRANT_ACCESS_DENIED');});
 }
 if(stage==='revoke'){
  const x=p.extraGrantFixture;await call(owner,'post','/auth/tenant',{companyId:x.companyId});
  await step('owner_cannot_revoke_grant',()=>call(owner,'post',`/companies/${x.companyId}/entitlements/${x.entitlementId}/revoke`,{},403));
  const first=await step('QA_admin_revocation_is_audited',async()=>(await call(admin,'post',`/companies/${x.companyId}/entitlements/${x.entitlementId}/revoke`,{},201)).json());
  await step('revocation_removes_only_the_revoked_access',async()=>{const s=await(await call(owner,'get','/billing/regularization')).json();if(s.accessAllowed)throw Error('REVOKED_GRANT_ACCESS');if(first.revokedById!==p.accounts.find(a=>a.role==='SUPER_ADMIN').id)throw Error('ACTOR_MISMATCH');});
  await step('duplicate_revocation_is_idempotent',async()=>{const second=await(await call(admin,'post',`/companies/${x.companyId}/entitlements/${x.entitlementId}/revoke`,{},201)).json();if(second.revokedAt!==first.revokedAt)throw Error('REVOCATION_CHANGED');});
  await step('company_deletion_preserves_financial_grant_history',()=>call(admin,'delete','/companies/'+x.companyId,{confirmationName:p.runId+'-D'},409));
 }
}catch{}
writeFileSync(file,JSON.stringify(p,null,2)+'\n',{mode:0o600});for(const [role,c]of[['SUPER_ADMIN',admin],['OWNER_A',owner]]){await c.storageState({path:join(dir,`session-${role}.private.json`)});await c.dispose();}
const report={stage,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results};writeFileSync(join(dir,`grant-${stage}.sanitized.json`),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
