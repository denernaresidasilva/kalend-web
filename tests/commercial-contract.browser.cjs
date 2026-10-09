/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const cwd = process.cwd();
const browserProfile = fs.mkdtempSync('/tmp/kalend-commercial-browser-');

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'], { cwd, stdio:['ignore','pipe','pipe'] });
const chrome = spawn('/usr/bin/google-chrome', ['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=9225','--user-data-dir='+browserProfile,'about:blank'], { stdio:'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket;
async function waitUrl(url) { for(let i=0;i<120;i++){ try { const response = await fetch(url); if(response.ok)return response; }catch{} await sleep(250); }throw Error('Server/browser did not start'); }
(async()=>{
 await waitUrl('http://127.0.0.1:3101/planos');
 const targets = await (await waitUrl('http://127.0.0.1:9225/json')).json();
 socket = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let sequence=0;const pending=new Map(); const errors=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const callback=pending.get(message.id);pending.delete(message.id);if(message.error)callback.reject(Error(JSON.stringify(message.error)));else callback.resolve(message.result);} if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 const fixture = `
 const realFetch=window.fetch.bind(window); window.__calls=[];
 const query=new URLSearchParams(location.search);
 const role=query.get('role')||'OWNER'; const count=Number(query.get('companies')??1);
 const company=id=>({id,name:'Empresa '+id,slug:id,status:'ACTIVE',isActive:true});
 const profile={user:{id:'user',name:'Teste comercial',email:'fixture@example.invalid',isSuperAdmin:role==='SUPER_ADMIN'},systemRole:role==='SUPER_ADMIN'?'SUPER_ADMIN':'USER',memberships:Array.from({length:count},(_,i)=>({id:'m'+i,role:role==='SUPER_ADMIN'?'OWNER':role,company:company('company'+i)})),selectedCompanyId:query.has('unselected')?null:count?'company0':null};
 const plan={id:'plan',name:'Plano API',code:'plan',monthlyPriceCents:10000,yearlyPriceCents:100000,description:'Plano de teste',isActive:true,isPublic:true,isFeatured:true,badge:'Badge API',features:[{id:'f',name:'Recurso API',enabled:true}],trialEnabled:true,trialDays:7};
 window.__failure=query.has('error'); window.__action=query.has('finance'); window.__days=Number(query.get('days')??3); window.__expired=query.has('expired');
 window.fetch=async(input,init)=>{
 const path=new URL(typeof input==='string'?input:input.url,location.origin).pathname;
 if(path.startsWith('/notifications'))return new Response(JSON.stringify({items:[],unreadCount:0,companyId:profile.selectedCompanyId,serverNow:'2026-10-01T12:00:00Z'}),{status:200,headers:{'Content-Type':'application/json'}});
 if(!['/auth/me','/auth/tenant','/billing/regularization','/plans/public','/communication/push/public-config'].includes(path))return realFetch(input,init);
 window.__calls.push(path);
 let data;
 if(path==='/auth/me')data=profile;
 if(path==='/auth/tenant'){profile.selectedCompanyId=JSON.parse(init.body).companyId;data=profile;}
 if(path==='/plans/public')data=[plan];
 if(path==='/communication/push/public-config')data={available:false,publicKey:null};
 if(path==='/billing/regularization'){
 if(window.__failure)return new Response('{}',{status:503});
 data={serverNow:'2026-10-01T12:00:00Z',trial:{active:!window.__expired,endsAt:'2026-10-04T12:00:00Z',remainingDays:profile.selectedCompanyId==='company1'?10:window.__days,expired:window.__expired},financial:{requiresAction:window.__action,status:query.has('grace')?'PAST_DUE':'TRIALING',paymentStatus:null},context:{systemRole:'USER',role,commercialApplicable:true},companyId:profile.selectedCompanyId,plans:[plan],gateways:[],subscription:null,pendingCheckout:null};}
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };`;
 await call('Page.addScriptToEvaluateOnNewDocument',{source:fixture});
 const pause=()=>sleep(350);
 async function navigate(query='',path='/conta'){
  await call('Page.navigate',{url:'http://127.0.0.1:3101'+path+query});
  for(let i=0;i<80;i++){await sleep(100);if(await evaluate("(!!document.querySelector('h1') || !!document.querySelector('[role=alert]')) && !document.body.innerText.includes('Verificando')"))return;}
  throw Error('Page did not settle: '+path+query+' '+await evaluate('document.body.innerText'));
 }
 const results=[];
 for(const days of [3,2,1]){
  await call('Page.navigate',{url:'http://127.0.0.1:3101/conta?days='+days});
  for(let i=0;i<80;i++){await sleep(100);if(await evaluate("window.__days === "+days+" && !!document.querySelector('.k-trial-notice')"))break;}
  assert.equal(await evaluate('location.pathname'),'/conta');
  await pause();assert.equal(await evaluate("document.activeElement.getAttribute('role')"),'dialog',await evaluate("JSON.stringify({days:window.__days,text:document.body.innerText,calls:window.__calls})"));
  assert.equal(await evaluate("document.querySelector('.k-trial-notice').getAttribute('aria-modal')"),'false');
  assert.match(await evaluate("document.querySelector('.k-trial-notice').innerText"),days===1?/termina amanhã/:new RegExp('termina em '+days+' dias'));
  for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   const size=await evaluate("(()=>{const r=document.querySelector('.k-trial-notice').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}})()");
   assert.ok(size.left>=0&&size.right<=width&&size.scrollWidth<=width,JSON.stringify(size));results.push({days,width,...size});
  }
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await pause();assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Fechar aviso do período de teste',await evaluate("document.activeElement.outerHTML"));;
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause();
  assert.equal(await evaluate("!!document.querySelector('.k-trial-notice')"),false);
  await evaluate("window.dispatchEvent(new Event('focus'))");await pause();
  assert.equal(await evaluate("!!document.querySelector('.k-trial-notice')"),false);
  await evaluate('sessionStorage.clear()');
 }
 await navigate('?days=2');await pause();
 await evaluate("[...document.querySelectorAll('.k-trial-notice button')].find(b=>b.innerText==='Continuar usando').click()");await pause();
 assert.equal(await evaluate("!!document.querySelector('.k-trial-notice')"),false);assert.equal(await evaluate('location.pathname'),'/conta');
 await call('Page.reload');await pause();assert.equal(await evaluate("!!document.querySelector('.k-trial-notice')"),false);
 await evaluate('sessionStorage.clear()');await navigate('?days=1');await pause();
 await evaluate("[...document.querySelectorAll('.k-trial-notice button')].find(b=>b.innerText==='Escolher plano').click()");await pause();assert.equal(await evaluate('location.pathname'),'/planos');
 for(const role of ['OWNER','ADMIN','PROFESSIONAL','RECEPTIONIST','CLIENT','SUPER_ADMIN']){
  await navigate('?role='+role+'&days=10');assert.equal(await evaluate('location.pathname'),'/conta');
  assert.equal(await evaluate("window.__calls.filter(x=>x==='/billing/regularization').length"),role==='SUPER_ADMIN'?0:1);
 }
 await navigate('?grace&days=10');assert.equal(await evaluate('location.pathname'),'/conta');
 await navigate('?expired');assert.equal(await evaluate('location.pathname'),'/conta');await pause();assert.equal(await evaluate("!!document.querySelector('.k-trial-expired-modal')?.open"),true);
 await navigate('?expired','/planos');assert.equal(await evaluate('location.pathname'),'/planos');
 await navigate('?finance&expired');assert.equal(await evaluate('location.pathname'),'/conta');assert.equal(await evaluate("!!document.querySelector('.k-trial-expired-modal')?.open"),true);
 await navigate('?finance','/planos');assert.equal(await evaluate('location.pathname'),'/conta/regularizar');
 await navigate('?finance','/conta/regularizar');await pause();assert.equal(await evaluate("window.__calls.filter(x=>x==='/billing/regularization').length"),1);
 await evaluate("window.__action=false; window.__expired=false; [...document.querySelectorAll('button')].find(b=>b.innerText==='Atualizar estado').click()");await pause();assert.equal(await evaluate('location.pathname'),'/painel/proprietario');
 await navigate('?error&days=10');assert.equal(await evaluate('location.pathname'),'/conta');assert.match(await evaluate('document.body.innerText'),/Tentar novamente/);
 await evaluate("window.__failure=false; [...document.querySelectorAll('button')].find(b=>b.innerText==='Tentar novamente').click()");await pause();assert.equal(await evaluate('location.pathname'),'/conta');assert.ok(await evaluate("!!document.querySelector('h1')"));
 await navigate('?companies=0');assert.equal(await evaluate('document.querySelectorAll("select").length'),0);assert.equal(await evaluate("window.__calls.filter(x=>x==='/billing/regularization').length"),0);
 await navigate('?companies=1&unselected&days=10');await pause();assert.equal(await evaluate("window.__calls.filter(x=>x==='/auth/tenant').length"),0);
 await navigate('?companies=2&days=3');
 assert.equal(await evaluate("document.querySelectorAll('.company-selector select,select[aria-label]').length > 0 || !!document.querySelector('select')"),true);
 await evaluate("sessionStorage.clear(); const s=document.querySelector('select');s.value='company1';s.dispatchEvent(new Event('change',{bubbles:true}))");await pause();
 // The existing selector confirms selection with its button.
 if(await evaluate("!![...document.querySelectorAll('button')].find(b=>b.innerText==='Continuar')"))await evaluate("[...document.querySelectorAll('button')].find(b=>b.innerText==='Continuar').click()");
 await pause();assert.equal(await evaluate("!!document.querySelector('.k-trial-notice')"),false);assert.ok(await evaluate("window.__calls.filter(x=>x==='/billing/regularization').length>=2"));
 assert.deepEqual(errors,[]);
 fs.writeFileSync('/tmp/phase42-commercial-browser.json',JSON.stringify({fixtureOnly:true,results,errors},null,2));
 console.log('Commercial browser scenarios passed; popup validated at all nine widths.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();server.kill();chrome.kill();});
