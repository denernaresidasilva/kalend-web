/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
 const loaded = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {module:loaded,exports:loaded.exports,require:id=>mocks[id],Error});
 return loaded.exports;
}
const fixture = (days=3, expired=false, requiresAction=false, status='TRIALING', companyId='company') => ({serverNow:'2026-10-01T12:00:00Z',trial:{active:!expired,endsAt:'2026-10-04T12:00:00Z',remainingDays:days,expired},financial:{requiresAction,status},context:{companyId,role:'OWNER'}});
const nav = load('lib/commercial-navigation.ts');
test('expired trial stays on initial route for the mandatory recovery modal',()=>{
 assert.equal(nav.commercialDestination(fixture(0,true,true,'ACTIVE'),'/conta'),'/conta');
 assert.equal(nav.commercialDestination(fixture(0,true,false),'/conta'),'/conta');
 assert.equal(nav.commercialDestination(fixture(10,false,false,'PAST_DUE'),'/conta'),'/conta');
});
for(const [days,message] of [[3,'Seu período de teste termina em 3 dias.'],[2,'Seu período de teste termina em 2 dias.'],[1,'Seu período de teste termina amanhã.'],[4,null],[30,null],[0,null]]) test(`server remainingDays=${days} controls nonblocking notice`,()=>{
 const data=fixture(days); assert.equal(nav.commercialDestination(data,'/conta'),'/conta'); assert.equal(nav.trialNotice(data),message);
});
test('correct routes and checkout route never loop; finance still outranks public plans',()=>{
 assert.equal(nav.commercialRedirect(fixture(0,true),'/planos','/conta'),null);
 assert.equal(nav.commercialRedirect(fixture(0,true),'/conta/planos','/conta'),null);
 assert.equal(nav.commercialRedirect(fixture(0,true,true),'/conta/regularizar','/conta'),null);
 assert.equal(nav.commercialRedirect(fixture(0,true,true),'/planos','/conta'),null);
 assert.equal(nav.commercialRedirect(fixture(4),'/conta','/conta'),null);
 assert.equal(nav.commercialRedirect(fixture(4),'/conta/regularizar','/conta'),'/conta');
 assert.equal(nav.commercialRedirect(fixture(0,true),'/conta/regularizar','/conta'),null);
});
test('commercial requests share one flight and cache per user and selected company',async()=>{
 const calls=[]; const state=load('lib/commercial-state.ts',{'./api':{tenantApi:async(company,path)=>{calls.push([company,path]);return fixture(3,false,false,'TRIALING',company);}}});
 const results=await Promise.all([state.getCommercialState('a','user'),state.getCommercialState('a','user')]);
 assert.equal(results[0],results[1]); assert.equal(calls.length,1);
 await state.getCommercialState('a','user');assert.equal(calls.length,1);
 const b=await state.getCommercialState('b','user'); assert.equal(b.context.companyId,'b');assert.equal(calls.length,2);
 state.clearCommercialState();await state.getCommercialState('b','user');assert.equal(calls.length,3);
 await state.getCommercialState('b','user',true);assert.equal(calls.length,4);
});
test('tenant change rejects stale in-flight response',async()=>{
 let finish;const state=load('lib/commercial-state.ts',{'./api':{tenantApi:()=>new Promise(resolve=>{finish=resolve;})}});
 const old=state.getCommercialState('old','user');state.clearCommercialState();finish(fixture(3,false,false,'TRIALING','old'));await assert.rejects(old,/contexto comercial mudou/);
});
test('API failure or malformed context cannot fabricate financial blocking or cache a false state',async()=>{
 let fail=true;const state=load('lib/commercial-state.ts',{'./api':{tenantApi:async()=>{if(fail)throw Error('Technical failure');return fixture();}}});
 await assert.rejects(state.getCommercialState('company','user'),/Technical failure/);fail=false;
 assert.equal((await state.getCommercialState('company','user',true)).financial.requiresAction,false);
 await assert.rejects(state.getCommercialState('foreign','user'),/validar/);
 const login=load('lib/commercial-navigation.ts',{'./commercial-state':{getCommercialState:async()=>{throw Error('Technical failure');}},'./company-selection':{accountDestination:()=>'/conta'}});
 assert.equal(await login.loginDestination({systemRole:'USER',selectedCompanyId:'company',user:{id:'user'}}),'/conta');
});
test('real backend context with root companyId and nullable financial status is accepted',async()=>{
 const data={...fixture(),companyId:'company',context:{systemRole:'USER',role:'CLIENT',commercialApplicable:true},financial:{requiresAction:false,status:null,paymentStatus:null}};
 const state=load('lib/commercial-state.ts',{'./api':{tenantApi:async()=>data}});
 assert.equal(await state.getCommercialState('company','user'),data);assert.equal(nav.commercialDestination(data,'/conta'),'/conta');
});

test('cache expires on elapsed time and never derives access from browser wall clock', async () => {
 let tick=0,calls=0;
 const data={...fixture(),accessAllowed:true,revalidateAfterMs:1000};
 const loadedModule={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('lib/commercial-state.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{module:loadedModule,exports:loadedModule.exports,require:()=>({tenantApi:async()=>{calls++;return data;}}),performance:{now:()=>tick},Date:class extends Date {static now(){return 0;}},Error});
 const state=loadedModule.exports;
 await state.getCommercialState('company','user');tick=999;await state.getCommercialState('company','user');assert.equal(calls,1);
 tick=1000;await state.getCommercialState('company','user');assert.equal(calls,2);
 assert.equal(state.cachedCommercialState('foreign','user'),null);
 assert.equal(state.commercialRevalidationDelay({...data,revalidateAfterMs:1}),1);
});
test('forced refresh publishes approval, while failures never clear the last expired decision',async()=>{
 let approved=false,fail=false;
 const state=load('lib/commercial-state.ts',{'./api':{tenantApi:async()=>{if(fail)throw Error('offline');return {...fixture(0,!approved),accessAllowed:approved,accessStatus:approved?'ACTIVE':'TRIAL_EXPIRED',revalidateAfterMs:5000};}}});
 const expired=await state.getCommercialState('company','user');assert.equal(expired.accessStatus,'TRIAL_EXPIRED');
 fail=true;await assert.rejects(state.getCommercialState('company','user',true),/offline/);assert.equal(state.cachedCommercialState('company','user').trial.expired,true);
 fail=false;approved=true;const active=await state.getCommercialState('company','user',true);assert.equal(active.accessAllowed,true);assert.equal(active.trial.expired,false);assert.equal(state.cachedCommercialState('company','user').accessStatus,'ACTIVE');
});
