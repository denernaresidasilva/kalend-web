/* eslint-disable @typescript-eslint/no-require-imports */
// Real Chrome + local Next; API/gateway fixtures. Not a DEV/provider certification.
const {spawn}=require('node:child_process');const fs=require('node:fs');const assert=require('node:assert/strict');
const {mkdtempSync}=fs;const profileDir=mkdtempSync('/tmp/kalend-block1-browser-');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3121'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
const chrome=spawn('/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--remote-debugging-port=9241','--user-data-dir='+profileDir,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;const checks=[];
async function waitURL(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return r;}catch{}await sleep(100);}throw Error('Local server/browser did not start');}
(async()=>{
 await waitURL('http://127.0.0.1:3121/planos');const targets=await(await waitURL('http://127.0.0.1:9241/json')).json();
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();const errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evalJS=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Browser.setPermission',{permission:{name:'notifications'},setting:'denied',origin:'http://127.0.0.1:3121'});
 const fixture=`
 const realFetch=fetch.bind(window);const params=new URLSearchParams(location.search);
 window.__offset=Number(params.get('offset')||0);window.__approved=false;window.__pending=false;window.__requests=[];window.__networkFail=false;window.__authenticated=!params.has('login');
 const deadline=Date.parse('2026-10-10T12:00:00Z');
 const company={id:'company-a',name:'Empresa A fixture',slug:'fixture-a',status:'TRIAL',isActive:true};
 const other={...company,id:'company-b',name:'Empresa B fixture'};
 const profile={user:{id:'fixture-user',name:'Owner fixture',email:'owner@example.invalid',isSuperAdmin:params.has('admin')},systemRole:params.has('admin')?'SUPER_ADMIN':'USER',selectedCompanyId:params.has('admin')?null:company.id,memberships:[{id:'ma',role:'OWNER',company},{id:'mb',role:'OWNER',company:other}],session:{expiresAt:'2030-01-01',refreshExpiresAt:'2030-01-02'}};
 if(params.has('login')){profile.memberships=profile.memberships.slice(0,1);profile.selectedCompanyId=null;}
 const plan={id:'plan-fixture',name:'Plano fixture',code:'fixture',description:'Plano publicado pelo servidor fixture',monthlyPriceCents:9900,yearlyPriceCents:99000,trialEnabled:true,trialDays:7,isActive:true,isPublic:true,isFeatured:false,displayOrder:1,badge:null,maxProfessionals:2,maxClients:100,maxUnits:1,maxMessages:1000,features:[]};
 window.fetch=async(input,init={})=>{
 const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.hostname!=='api.kalend.invalid')return realFetch(input,init);
 window.__requests.push({path:u.pathname,method:init.method||'GET'});let data={};const path=u.pathname;
 if(path==='/auth/login'){window.__authenticated=true;data={authenticated:true};}
 else if(path==='/auth/me'){if(!window.__authenticated)return new Response('{}',{status:401});data=profile;}
 else if(path==='/auth/refresh')return new Response('{}',{status:401});
 else if(path==='/auth/tenant'){profile.selectedCompanyId=JSON.parse(init.body).companyId;data=profile;}
 else if(path==='/auth/logout'){window.__authenticated=false;return new Response(null,{status:204});}
 else if(path==='/billing/checkout'){window.__pending=true;data={id:'payment-fixture',status:'PENDING',creationState:'CREATED'};}
 else if(path==='/billing/regularization'){
 if(window.__networkFail)return new Response('{}',{status:503});
 const paid=window.__approved||profile.selectedCompanyId==='company-b';const expired=!paid&&window.__offset>=0;
 data={companyId:profile.selectedCompanyId,serverNow:new Date(deadline+window.__offset).toISOString(),accessAllowed:paid||!expired,accessStatus:paid?'ACTIVE':expired?'TRIAL_EXPIRED':'TRIAL_EXPIRING',revalidateAfterMs:1000,trial:{active:!paid&&!expired,expired,endsAt:new Date(deadline).toISOString(),remainingDays:expired?0:1},financial:{requiresAction:false,status:paid?'ACTIVE':expired?'EXPIRED':'TRIALING'},context:{systemRole:'USER',role:'OWNER',commercialApplicable:true},plans:[plan],gateways:[{provider:'STRIPE',environment:'SANDBOX',capabilities:{checkout:true,recurring:false}}],subscription:{id:'sub',status:paid?'ACTIVE':expired?'EXPIRED':'TRIALING',planName:plan.name,planId:plan.id,trialEndsAt:new Date(deadline).toISOString(),billingInterval:'MONTHLY'},pendingCheckout:window.__pending&&!paid?{id:'payment-fixture',gateway:'STRIPE',billingInterval:'MONTHLY',creationState:'CREATED',checkoutUrl:'https://checkout.example.invalid/test'}:null};
 }else if(path==='/plans/public')data=[plan];
 else if(path==='/communication/push/public-config')data={available:false,publicKey:null,environment:null};
 else if(path.includes('notifications'))data=path.includes('unread')?{count:0}:{items:[],unreadCount:0};
 else data=[];
 return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
 };`;
 await call('Page.addScriptToEvaluateOnNewDocument',{source:fixture});
 async function until(expression,label){for(let i=0;i<80;i++){if(await evalJS(expression))return;await sleep(100);}throw Error(label+': '+await evalJS('document.body.innerText'));}
 async function nav(offset,path='/painel/proprietario',extra=''){await call('Page.navigate',{url:'http://127.0.0.1:3121'+path+'?offset='+offset+extra});await until("window.__requests?.some(r=>r.path==='/billing/regularization') || "+JSON.stringify(extra.includes('admin')), 'commercial response');await sleep(150);}
 const modal="document.querySelector('.k-trial-expired-modal')";
 for(const offset of [-300000,-1000,0,1000,3600000]){
  await nav(offset);await until(offset>=0?`!!${modal}?.open`:`!${modal} && !!document.querySelector('.k-admin-shell')`,'deadline '+offset);
  assert.equal(await evalJS(`!!${modal}`),offset>=0);checks.push({scenario:'server deadline',offset,modal:offset>=0});
 }
 await nav(-1000);await evalJS('Date.now=()=>4102444800000');await sleep(1200);assert.equal(await evalJS(`!!${modal}`),false);checks.push({scenario:'wrong browser wall clock does not expire trial',passed:true});
 await evalJS('window.__offset=0');await until(`!!${modal}?.open`,'automatic expiration');checks.push({scenario:'expiration without refresh',passed:true});
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evalJS(`${modal}.open`),true);checks.push({scenario:'mandatory modal cannot close with Escape',passed:true});
 for(const path of ['/conta','/conta/planos','/conta/configuracoes/email','/planos']){await nav(1000,path);await until(`!!${modal}?.open`,'direct '+path);checks.push({scenario:'direct expired route',path,passed:true});}
 // SPA route change while the same mandatory modal remains mounted.
 await evalJS("history.pushState({},'', '/conta/planos');window.dispatchEvent(new PopStateEvent('popstate'))");await sleep(300);assert.equal(await evalJS(`${modal}.open`),true);checks.push({scenario:'SPA route cannot dismiss modal',passed:true});
 await call('Page.reload',{ignoreCache:true});await until(`!!${modal}?.open`,'reload');checks.push({scenario:'reload preserves mandatory modal',passed:true});
 for(const width of [375,1280]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});const size=await evalJS(`(()=>{const d=${modal},r=d.getBoundingClientRect();return {left:r.left,right:r.right,overflow:d.scrollWidth>d.clientWidth+1}})()`);assert.ok(size.left>=0&&size.right<=width&&!size.overflow,JSON.stringify(size));checks.push({scenario:'modal responsive',width,passed:true});}
 // Existing plan catalog and checkout form inside the modal, selection survives polling.
 await evalJS(`${modal}.querySelector('input[name=plan]').click()`);await sleep(1200);assert.equal(await evalJS(`${modal}.querySelector('input[name=plan]').checked`),true);
 await evalJS(`(()=>{const s=${modal}.querySelector('select');s.value='STRIPE';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await sleep(100);await evalJS(`${modal}.querySelector('form').requestSubmit()`);await until(`${modal}?.innerText.includes('Pagamento pendente')`,'pending checkout');
 assert.equal(await evalJS('window.__requests.filter(r=>r.path==="/billing/checkout").length'),1);assert.equal(await evalJS(`${modal}.open`),true);checks.push({scenario:'checkout pending keeps access blocked and modal visible',passed:true});
 await evalJS('window.__networkFail=true');await sleep(1300);assert.equal(await evalJS(`${modal}.open`),true);checks.push({scenario:'network failure cannot dismiss expired modal',passed:true});
 await evalJS('window.__networkFail=false;window.__approved=true');await until(`!${modal}`,'approved payment');checks.push({scenario:'verified server approval clears modal without refresh',passed:true});
 await nav(1000);await until(`!!${modal}?.open`,'account recovery');await evalJS(`[...${modal}.querySelectorAll('button')].find(b=>b.textContent==='Minha conta').click()`);await until(`${modal}.innerText.includes('Owner fixture')`,'account');
 await evalJS(`(()=>{const s=${modal}.querySelector('select');s.value='company-b';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(100);await evalJS(`[...${modal}.querySelectorAll('button')].find(b=>b.textContent==='Continuar').click()`);await until(`!${modal}`,'other tenant');checks.push({scenario:'expired A does not block paid B',passed:true});
 await nav(1000,'/super-admin/configuracoes','&admin=1');await sleep(300);assert.equal(await evalJS(`!!${modal}`),false);checks.push({scenario:'Super Admin not blocked',passed:true});
 await call('Page.navigate',{url:'http://127.0.0.1:3121/?offset=1000&login=1'});await until("!!document.querySelector('form input[name=email]')",'login form');
 await evalJS("document.querySelector('input[name=email]').value='owner@example.invalid';document.querySelector('input[name=password]').value='fixture-password';document.querySelector('form').requestSubmit()");await until(`!!${modal}?.open && location.pathname === '/painel/proprietario'`,'modal after login');checks.push({scenario:'login and tenant selection show expired modal immediately',passed:true});
 await evalJS(`[...${modal}.querySelectorAll('button')].find(b=>b.textContent==='Sair').click()`);await until("!document.querySelector('.k-trial-expired-modal') && !!document.querySelector('form input[name=email]')",'logout recovery');checks.push({scenario:'expired owner can logout',passed:true});
 assert.deepEqual(errors,[]);fs.writeFileSync('/tmp/kalend-block1-browser-results.json',JSON.stringify({fixtureOnly:true,checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,provider:'MOCK'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();server.kill();chrome.kill();});
