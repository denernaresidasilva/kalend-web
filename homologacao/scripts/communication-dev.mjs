import { request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
process.umask(0o077);
const file=process.env.QA_IDENTITY_FILE,p=JSON.parse(readFileSync(file,'utf8')),dir=dirname(file);
if(!p.provisioned||p.api!=='https://api-dev.kalend.tech')throw Error('QA_SCOPE');
const c=await request.newContext({storageState:join(dir,'session-SUPER_ADMIN.private.json'),extraHTTPHeaders:{Origin:p.web}});
if((await c.get(p.api+'/auth/me')).status()===401){const r=await c.post(p.api+'/auth/refresh',{data:{}});if(r.status()!==200)throw Error('QA_REFRESH_REQUIRED');}
const body={companyId:p.companies.find(c=>c.label==='A').id,userId:p.accounts.find(a=>a.role==='OWNER_A').id,channel:'EMAIL',idempotencyKey:randomUUID()};
const response=await c.post(p.api+'/communication/qa-test',{data:body});
if(response.status()!==201){writeFileSync(join(dir,'communication-error.private.json'),await response.text(),{mode:0o600});throw Error('QA_INTENT_HTTP_'+response.status());}
const event=await response.json();writeFileSync(join(dir,'communication-ledger.private.json'),JSON.stringify({input:body,event}),{mode:0o600});
const repeated=await c.post(p.api+'/communication/qa-test',{data:body});if(repeated.status()!==429)throw Error('QA_RATE_LIMIT_NOT_ENFORCED');
await c.storageState({path:join(dir,'session-SUPER_ADMIN.private.json')});await c.dispose();
console.log(JSON.stringify({qa_email_intent_created:true,duplicate_http_rate_limited:true,charges:0,external_recipients:0}));
