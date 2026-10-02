/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const cwd = process.cwd();
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3112'], { cwd, stdio:['ignore','pipe','pipe'] });
const chrome = spawn('/usr/bin/google-chrome', ['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=9232','--user-data-dir=/tmp/kalend-block2-browser-profile','about:blank'], { stdio:'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket;
async function waitUrl(url) { for(let i=0;i<120;i++){ try { const response = await fetch(url); if(response.ok)return response; }catch{} await sleep(250); }throw Error('Server/browser did not start'); }
(async()=>{
 await waitUrl('http://127.0.0.1:3112/planos');
 const targets = await (await waitUrl('http://127.0.0.1:9232/json')).json();
 socket = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let sequence=0;const pending=new Map(); const errors=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const callback=pending.get(message.id);pending.delete(message.id);if(message.error)callback.reject(Error(JSON.stringify(message.error)));else callback.resolve(message.result);} if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');

 const fixture = `
 const realFetch=window.fetch.bind(window);
 const query=new URLSearchParams(location.search);
 const role=query.get('fixture-role')||'SUPER_ADMIN';
 const companies=[{id:'company-one',name:'Empresa anterior',slug:'anterior',status:'ACTIVE',isActive:true},{id:'company-two',name:'Empresa selecionada com nome extenso para validação',slug:'selecionada',status:'ACTIVE',isActive:true}];
 let profile={user:{id:'account-fixture',name:'Maria Silva de Validação',email:'conta-com-endereco-longo@example.invalid',isSuperAdmin:role==='SUPER_ADMIN'},systemRole:role==='SUPER_ADMIN'?'SUPER_ADMIN':'USER',memberships:role==='SUPER_ADMIN'?[]:companies.map((company,i)=>({id:'membership-'+i,role,company})),selectedCompanyId:role==='SUPER_ADMIN'?null:'company-two',session:{expiresAt:'2030-01-01T12:00:00Z',refreshExpiresAt:'2030-01-02T12:00:00Z'}};
 if(query.has('fixture-single')){profile.memberships=profile.memberships.slice(0,1);profile.selectedCompanyId=null;}
 window.__accountCalls=[];window.__logoutFailed=false;window.__authExpired=query.has('fixture-expired');
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.hostname!=='api.kalend.invalid')return realFetch(input,init);
  const path=url.pathname;window.__accountCalls.push({path,method:init.method||'GET',body:init.body||null});
  let data={};let status=200;
  if(path==='/auth/me'){data=profile;if(window.__authExpired)status=401;else if(query.has('fixture-error'))status=503;}
  else if(path==='/auth/refresh'){status=401;}
  else if(path==='/auth/logout-all'||path==='/auth/logout'){if(window.__logoutFailed){status=503;}else {window.__authExpired=true;status=204;}}
  else if(path==='/auth/tenant'){const parsed=JSON.parse(init.body);profile={...profile,selectedCompanyId:parsed.companyId};data=profile;}
  else if(path==='/billing/regularization'){data={serverNow:'2026-10-02T12:00:00Z',companyId:profile.selectedCompanyId,context:{systemRole:profile.systemRole,role,commercialApplicable:true},trial:{active:false,endsAt:null,remainingDays:0,expired:false},financial:{requiresAction:false,status:'ACTIVE'},subscription:null,plans:[],gateways:[],pendingCheckout:null};}
  else if(path==='/communication/push/public-config'){data={available:false,publicKey:null,environment:null};}
  else if(path==='/communication/push/subscriptions'){data=[];}
  else {status=404;}
  return new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 };
 `;
 await call('Page.addScriptToEvaluateOnNewDocument',{source:fixture});
 const results=[];
 const widths=[360,375,390,414,768,1024,1280,1440,1920];
 const roles=['SUPER_ADMIN','OWNER','ADMIN','PROFESSIONAL','RECEPTIONIST','CLIENT'];
 const navigate=async(path)=>{await call('Page.navigate',{url:'http://127.0.0.1:3112'+path});for(let i=0;i<60;i++){await sleep(50);if(await evaluate("!!document.querySelector('.k-account-page') || document.body.innerText.includes('sessão não está ativa') || document.body.innerText.includes('Serviço ou integração indisponível')"))break;}};
 for(const role of roles){
  for(const section of ['perfil','seguranca','preferencias']){
   await navigate('/conta?fixture-role='+role+'#'+section);
   assert.equal(await evaluate("document.querySelector('.k-account-heading h1')?.textContent"),{perfil:'Perfil',seguranca:'Segurança',preferencias:'Preferências'}[section]);
   assert.equal(await evaluate("document.querySelectorAll('.k-admin-header').length"),1);
   assert.equal(await evaluate("document.querySelectorAll('input[type=password],input[type=file]').length"),0);
   if(section==='perfil'){
    assert.equal(await evaluate("document.body.innerText.includes('Maria Silva de Validação')"),true);
    assert.equal(await evaluate("document.querySelector('.k-account-profile').innerText.includes('Empresa anterior')"),false);
    assert.equal(await evaluate("document.querySelector('.k-account-profile').innerText.includes('acesso global')"),role==='SUPER_ADMIN');
   }
   for(const width of widths){
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    for(const theme of ['dark','light']){
     await evaluate(`document.documentElement.dataset.theme='${theme}';document.documentElement.dataset.themePreference='${theme}';window.dispatchEvent(new Event('kalend:theme'))`);await sleep(15);
     const measurement=await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerHeight:document.querySelector('.k-admin-header').getBoundingClientRect().height,avatarFits:(()=>{const e=document.querySelector('.k-account-profile .k-avatar');if(!e)return true;const range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect(),r=e.getBoundingClientRect();return t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1;})(),controls:[...document.querySelectorAll('.k-account-page button,.k-account-page select')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<0)}).map(e=>e.textContent)})");
     results.push({role,section,width,theme,...measurement});
    }
   }
  }
  console.log('validated account role',role);
 }
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await navigate('/conta?fixture-role=CLIENT');await sleep(400);
 await evaluate("document.querySelector('button[aria-label=\"Abrir menu\"]').click()");await sleep(80);
 assert.equal(await evaluate("document.querySelector('dialog').open"),true);
 assert.equal(await evaluate("document.body.style.overflow"),'hidden');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(80);
 assert.equal(await evaluate("!!document.querySelector('dialog')"),false);assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Abrir menu');
 await evaluate("document.querySelector('button[aria-label=\"Abrir menu\"]').click()");await sleep(80);
 await evaluate("document.querySelector('dialog a[href=\"/conta#seguranca\"]').click()");await sleep(100);
 assert.equal(await evaluate("!!document.querySelector('dialog')"),false);assert.equal(await evaluate("document.querySelector('h1').textContent"),'Segurança');
 await evaluate("[...document.querySelectorAll('.k-account-page button')].find(e=>e.textContent.includes('Sair de todos')).focus();[...document.querySelectorAll('.k-account-page button')].find(e=>e.textContent.includes('Sair de todos')).click()");await sleep(80);
 assert.equal(await evaluate("document.querySelector('dialog').open"),true);
 assert.equal(await evaluate("window.__accountCalls.filter(c=>c.path==='/auth/logout-all').length"),0);
 await evaluate("document.querySelector('dialog button').focus()");
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
 assert.match(await evaluate("document.activeElement.textContent"),/Confirmar/);
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Fechar menu');

 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(80);
 assert.equal(await evaluate("!!document.querySelector('dialog')"),false);assert.match(await evaluate("document.activeElement.textContent"),/Sair de todos/);
 await evaluate("[...document.querySelectorAll('.k-account-page button')].find(e=>e.textContent.includes('Sair de todos')).click()");await sleep(80);
 await evaluate("window.__logoutFailed=true;[...document.querySelectorAll('dialog button')].find(e=>e.textContent.includes('Confirmar')).click()");await sleep(150);
 assert.equal(await evaluate('location.pathname'),'/conta');assert.equal(await evaluate("!!document.querySelector('dialog [role=alert]')"),true);
 await evaluate("window.__logoutFailed=false;[...document.querySelectorAll('dialog button')].find(e=>e.textContent.includes('Confirmar')).click()");await sleep(350);assert.equal(await evaluate('location.pathname'),'/');
 await navigate('/conta?fixture-role=OWNER&fixture-single');await sleep(100);
 assert.equal(await evaluate("window.__accountCalls.filter(c=>c.path==='/auth/tenant').length"),0);
 assert.equal(await evaluate("document.querySelector('.k-account-profile').innerText.includes('Nenhuma empresa selecionada')"),true);
 await evaluate("const s=document.querySelector('select');s.value='company-one';s.dispatchEvent(new Event('change',{bubbles:true}));");await sleep(80);
 await evaluate("[...document.querySelectorAll('.k-account-page button')].find(e=>e.textContent==='Continuar').click()");await sleep(250);
 assert.equal(await evaluate("window.__accountCalls.filter(c=>c.path==='/auth/tenant').length"),1);assert.equal(await evaluate("document.querySelector('.k-account-profile').innerText.includes('Empresa anterior')"),true);
 await navigate('/conta?fixture-role=PROFESSIONAL#preferencias');
 await evaluate("document.querySelector('.k-admin-header a[aria-label=\"Minha conta\"]').click()");await sleep(80);assert.equal(await evaluate("document.querySelector('h1').textContent"),'Perfil');
 await evaluate("document.querySelector('.k-admin-header a[aria-label=\"Configurações\"]').click()");await sleep(80);assert.equal(await evaluate("document.querySelector('h1').textContent"),'Preferências');
 await evaluate("document.documentElement.dataset.theme='dark';document.documentElement.dataset.themePreference='dark';window.dispatchEvent(new Event('kalend:theme'))");await sleep(50);
 await evaluate("document.querySelector('.k-admin-header button[aria-label=\"Ativar modo claro\"]').click()");await sleep(50);assert.equal(await evaluate("localStorage.getItem('kalend:theme')"),'light');
 await call('Page.reload');await sleep(300);assert.equal(await evaluate("document.documentElement.dataset.theme"),'light');
 await navigate('/conta?fixture-expired');assert.equal(await evaluate("document.body.innerText.includes('sessão não está ativa')"),true);
 await navigate('/conta?fixture-error');assert.equal(await evaluate("!!document.querySelector('[role=alert]')"),true);assert.equal(await evaluate("!!document.querySelector('.k-account-profile')"),false);
 await navigate('/conta?fixture-role=SUPER_ADMIN');await evaluate("document.documentElement.dataset.theme='dark';document.documentElement.dataset.themePreference='dark';window.dispatchEvent(new Event('kalend:theme'))");await sleep(80);
 const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-block2-account-390.png',Buffer.from(shot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(80);const desktop=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/kalend-block2-account-1440.png',Buffer.from(desktop.data,'base64'));
 const failures=results.filter(r=>r.scrollWidth>r.width+1||r.headerHeight>80||!r.avatarFits||r.controls.length);
 fs.writeFileSync('/tmp/kalend-block2-account-browser.json',JSON.stringify({fixtureOnly:true,results,errors,interactionChecks:'drawer Escape/focus/scroll, section anchors, cancellation, logout-all failure/retry, explicit company choice, avatar/settings destinations, theme/reload, expired session/error passed'},null,2));
 console.log(JSON.stringify({checks:results.length,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();chrome.kill('SIGTERM');server.kill('SIGTERM');});
