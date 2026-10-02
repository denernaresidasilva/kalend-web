/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const cwd = process.cwd();
const owner = process.argv.includes('--owner');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'], { cwd, stdio:['ignore','pipe','pipe'] });
const chrome = spawn('/usr/bin/google-chrome', ['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=9224','--user-data-dir=/tmp/kalend-phase43-browser-profile','about:blank'], { stdio:'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket;
async function waitUrl(url) { for(let i=0;i<120;i++){ try { const response = await fetch(url); if(response.ok)return response; }catch{} await sleep(250); }throw Error('Server/browser did not start'); }
(async()=>{
 await waitUrl('http://127.0.0.1:3100/planos');
 const targets = await (await waitUrl('http://127.0.0.1:9224/json')).json();
 socket = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let sequence=0;const pending=new Map(); const errors=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const callback=pending.get(message.id);pending.delete(message.id);if(message.error)callback.reject(Error(JSON.stringify(message.error)));else callback.resolve(message.result);} if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 const fixture = `
 window.__phase42Fixture = true;
 const realFetch=window.fetch.bind(window);
 const p={id:'fixture-plan',name:'Plano de validação',code:'fixture',description:'Catálogo de teste para validar layout, sem publicação.',monthlyPriceCents:10000,yearlyPriceCents:100000,trialEnabled:true,trialDays:7,badge:'Destaque do catálogo',isFeatured:true,displayOrder:0,isActive:true,isPublic:true,maxProfessionals:10,maxClients:null,maxUnits:2,maxMessages:500,features:[{id:'f',code:'agenda',name:'Recurso de validação',enabled:true}]};
 const company={id:'fixture-company',name:'Empresa de validação responsiva',slug:'validacao',status:'ACTIVE',isActive:true};
 const profile={user:{id:'fixture-user',name:'Usuário de validação',email:'fixture@example.invalid',isSuperAdmin:true},systemRole:'SUPER_ADMIN',memberships:[],selectedCompanyId:null,session:{expiresAt:'2030-01-01',refreshExpiresAt:'2030-01-02'}};
 ${owner ? "profile.systemRole='USER';profile.user.isSuperAdmin=false;profile.memberships=[{id:'membership',role:'OWNER',company}];profile.selectedCompanyId=company.id;" : ''}
 const gatewayNames=['MERCADO_PAGO','STRIPE','PAGBANK','ASAAS'];
 const gateways=gatewayNames.map(gateway=>({gateway,provider:gateway,enabled:false,environment:'SANDBOX',configured:false,status:'NOT_CONFIGURED',publicId:null,capabilities:{checkout:false,recurring:false,nativeIdempotency:false,cancelAtPeriodEnd:false,webhookManagement:false},recurringConfigured:false,webhookUrl:null,webhookStatus:'NOT_CONFIGURED',webhookConfigured:false,lastValidatedAt:null,adapterAvailable:false,webhookPath:'/webhooks/'+gateway.toLowerCase().replaceAll('_','-')}));
 const subscription={id:'fixture-subscription',status:'TRIALING',company,plan:p,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',trialEndsAt:'2026-10-08T00:00:00Z',currentPeriodStart:null,currentPeriodEnd:null,lastPayment:null,billingInterval:'MONTHLY',gateway:'MANUAL',environment:null,payments:[],trialStartedAt:'2026-10-01T00:00:00Z',graceEndsAt:null,canceledAt:null,cancellationRequestedAt:null,cancelAtPeriodEnd:false};
 const event={id:'fixture-event',gateway:'STRIPE',eventType:'TEST_EVENT',externalEventId:'external-fixture',status:'RECEIVED',receivedAt:'2026-10-01T00:00:00Z',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',processedAt:null,companyId:null,paymentId:null,attempts:0,errorMessage:null};
 const summary={generatedAt:'2026-10-01T12:00:00Z',period:{from:'2026-10-01T00:00:00Z',to:'2026-10-31T23:59:59Z',timezone:'UTC'},companies:{total:1,active:1,trial:0,suspended:0,canceled:0,inactive:0,new:1},users:{total:1},subscriptions:{total:1,active:0,trialing:1,pastDue:0,canceled:0,expired:0},payments:{total:0,approved:0,pending:0,failed:0,canceled:0,refunded:0,revenueCents:0,monthlyRevenueCents:0},recentEvents:[event]};
 window.fetch=async(input,init={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.hostname!=='api.kalend.invalid')return realFetch(input,init);let data=[];const path=url.pathname;
 if(path==='/auth/me')data=profile;
 else if(path==='/dashboard/summary')data=summary;
 else if(path==='/plans/public'||path==='/plans')data=[p,{...p,id:'monthly-fixture',name:'Plano mensal',isFeatured:false,badge:null,yearlyPriceCents:null}];
 else if(path.startsWith('/plans/'))data=p;
 else if(path==='/companies')data=[{...company,owner:{id:'owner',name:'Responsável',email:'owner@example.invalid'},usersCount:1,subscription,createdAt:'2026-10-01',updatedAt:'2026-10-01'}];
 else if(path==='/subscriptions')data=[subscription];else if(path.startsWith('/subscriptions/'))data=subscription;
 else if(path==='/payment-gateways')data=gateways;else if(path.startsWith('/payment-gateways/'))data=gateways.find(g=>path.endsWith(g.gateway));
 else if(path==='/users')data=[{...profile.user,isActive:true,phone:null,createdAt:'2026-10-01',updatedAt:'2026-10-01',memberships:[]}];
 else if(path==='/users/summary')data={total:1,active:1,inactive:0,superAdmins:1,owners:0,professionals:0,clients:0};
 else if(path==='/finance/summary')data={revenueCents:0,monthlyRevenueCents:0,paymentsCount:0,approvedCount:0,pendingCount:0,failedCount:0,canceledCount:0,refundedCount:0};
 else if(path==='/webhooks/summary')data={total:1,received:1,processing:0,processed:0,failed:0,ignored:0};
 else if(path==='/webhooks')data=[event];else if(path.startsWith('/webhooks/'))data=event;
 else if(path==='/billing/regularization')data={serverNow:'2026-10-01T12:00:00Z',trial:{active:false,endsAt:'2026-09-30T00:00:00Z',remainingDays:0,expired:true},financial:{requiresAction:location.search.includes('fixture-pendencia'),status:'EXPIRED'},context:{systemRole:'USER',role:'OWNER',commercialApplicable:true},companyId:company.id,status:'TRIAL_EXPIRED',reason:location.search.includes('fixture-pendencia')?'PAYMENT_REQUIRED':'TRIAL_EXPIRED',accessAllowed:false,trialExpired:true,subscription:{...subscription,status:'EXPIRED',planId:p.id,planName:p.name,trialEndsAt:'2026-09-30T00:00:00Z'},plans:[p,{...p,id:'monthly-fixture',name:'Plano mensal',isFeatured:false,badge:null,yearlyPriceCents:null}],gateways:[{provider:'STRIPE',environment:'SANDBOX',capabilities:{checkout:true,recurring:false}}],pendingCheckout:null};
 else if(path==='/communication/push/public-config')data={available:false,publicKey:null};
 if(path==='/billing/regularization' && location.search.includes('fixture-carencia'))data={...data,trial:{active:false,endsAt:null,remainingDays:0,expired:false},financial:{requiresAction:false,status:'PAST_DUE'},status:'PAST_DUE',reason:null,accessAllowed:true,trialExpired:false,pendingCheckout:{id:'optional-upgrade',creationState:'CREATED',checkoutUrl:'https://checkout.example.invalid',gateway:'STRIPE',planId:p.id,billingInterval:'MONTHLY'}};
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});};`;
 await call('Page.addScriptToEvaluateOnNewDocument',{source:fixture});
 const widths=[360,375,390,414,768,1024,1280,1440,1920];
 const routes=owner ? ['/conta/planos','/conta/regularizar','/conta'] : ['/','/super-admin','/planos','/super-admin/empresas','/super-admin/empresas/nova','/super-admin/usuarios','/super-admin/planos','/super-admin/planos/novo','/super-admin/planos/fixture-plan','/super-admin/assinaturas','/super-admin/assinaturas/fixture-subscription','/super-admin/financeiro','/super-admin/webhooks','/super-admin/webhooks/fixture-event','/super-admin/configuracoes','/super-admin/configuracoes/pagamentos','/super-admin/configuracoes/pagamentos/PAGBANK','/super-admin/comunicacao'];
 const results=[];
 for(const route of routes){
  await call('Page.navigate',{url:'http://127.0.0.1:3100'+route});
  for(let i=0;i<60;i++){await sleep(100); if(await evaluate("document.querySelector('h1') && !document.body.innerText.includes('Verificando sessão')"))break;}
  for(const width of widths){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(35);
   for(const theme of ['light','dark']){await evaluate(`document.documentElement.dataset.theme='${theme}';document.documentElement.dataset.themePreference='${theme}';window.dispatchEvent(new Event('kalend:theme'))`);await sleep(15);
    const measurement=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerHeight:document.querySelector('.k-admin-header')?.getBoundingClientRect().height,title:document.querySelector('h1')?.innerText,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1&&getComputedStyle(e).position!=='absolute'&&!e.closest('.companies-table-wrap,.companies-table-wrapper,.commercial-table-wrap,.k-table-scroll,.k-tooltip-wrap')}).slice(0,8).map(e=>({tag:e.tagName,class:e.className,right:Math.round(e.getBoundingClientRect().right)}))})`);
    results.push({route,width,theme,...measurement});
   }
  }
  console.log('validated',route);
 }
 fs.writeFileSync(owner ? '/tmp/kalend-phase43-owner-responsive.json' : '/tmp/kalend-phase43-responsive.json',JSON.stringify({fixtureOnly:true,results,errors},null,2));
 fs.writeFileSync(owner ? '/tmp/kalend-phase43-owner-responsive.json' : '/tmp/kalend-phase43-responsive.json',JSON.stringify({fixtureOnly:true,results,errors},null,2));
 if (!owner) {
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:3100/super-admin'});await sleep(600);
 await evaluate(`document.querySelector('button[aria-label="Abrir menu"]').click()`);await sleep(100);
 assert.equal(await evaluate("document.querySelector('dialog').open"),true);
 assert.equal(await evaluate("document.body.style.overflow"),'hidden');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(100);
 assert.equal(await evaluate("!!document.querySelector('dialog')"),false);
 assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Abrir menu');
 // First visit stays dark even on a light OS; icon toggles persist across reload.
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await evaluate("localStorage.removeItem('kalend:theme')");await call('Page.reload');await sleep(600);
 assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
 await evaluate("document.querySelector('button[aria-label=\"Ativar modo claro\"]').click()");await sleep(100);
 assert.equal(await evaluate("localStorage.getItem('kalend:theme')"),'light');
 await call('Page.reload');await sleep(600);assert.equal(await evaluate("document.documentElement.dataset.theme"),'light');
 await evaluate("document.querySelector('button[aria-label=\"Ativar modo escuro\"]').click()");await sleep(100);
 assert.equal(await evaluate("document.documentElement.dataset.theme"),'dark');
 assert.equal(await evaluate("document.querySelector('.k-admin-header a[aria-label=\"Minha conta\"]').getAttribute('href')"),'/conta');
 assert.equal(await evaluate("document.querySelector('.k-admin-header a[aria-label=\"Nova empresa\"]').textContent"),'');
 assert.equal(await evaluate("['Atualizar métricas','Atualizado em','Período mensal','Acompanhe os dados e a operação'].some(t=>document.body.innerText.includes(t))"),false);
 const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-phase43-dashboard-390.png',Buffer.from(shot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);
 const desktop=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-phase43-dashboard-1440.png',Buffer.from(desktop.data,'base64'));
 await call('Page.navigate',{url:'http://127.0.0.1:3100/'});await sleep(500);
 const login=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-phase43-login.png',Buffer.from(login.data,'base64'));

 } else {
  await call('Page.navigate',{url:'http://127.0.0.1:3100/conta/planos'});await sleep(700);
  await evaluate(`document.querySelector('input[name="plan"]').click()`);await sleep(100);
  assert.equal(await evaluate("document.querySelector('input[name=plan]').checked"),true);
  assert.match(await evaluate("document.body.innerText"),/Total selecionado/);
  await evaluate(`document.querySelectorAll('input[name="billing-interval"]')[1].click()`);await sleep(100);
  assert.match(await evaluate("document.body.innerText"),/cobrança anual/);
  await call('Page.navigate',{url:'http://127.0.0.1:3100/conta'});await sleep(900);
  assert.equal(await evaluate('location.pathname'),'/planos');
  await call('Page.navigate',{url:'http://127.0.0.1:3100/conta?fixture-pendencia'});await sleep(900);
  assert.equal(await evaluate('location.pathname'),'/conta/regularizar');
  await call('Page.navigate',{url:'http://127.0.0.1:3100/conta?fixture-carencia'});await sleep(900);
  assert.equal(await evaluate('location.pathname'),'/conta');
  const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-phase43-plans-authenticated.png',Buffer.from(shot.data,'base64'));
 }
 fs.writeFileSync(owner ? '/tmp/kalend-phase43-owner-responsive.json' : '/tmp/kalend-phase43-responsive.json',JSON.stringify({fixtureOnly:true,results,errors,interactionChecks:owner ? 'plan selection, annual period, expired trial redirect, financial priority passed' : 'drawer Escape/focus/scroll, dark default, icon toggle/persistence/reload, avatar/action passed'},null,2));
 const failures=results.filter(result=>result.scrollWidth>result.width+1 || result.headerHeight>80);console.log(JSON.stringify({checks:results.length,overflowFailures:failures.map(({route,width,theme,scrollWidth,overflow})=>({route,width,theme,scrollWidth,overflow})),errors},null,2));
 if(failures.length||errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();chrome.kill('SIGTERM');server.kill('SIGTERM');});
