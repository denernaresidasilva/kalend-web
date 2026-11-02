import { chromium, request } from '@playwright/test';import { readFileSync } from 'node:fs';
process.umask(0o077);
const p=JSON.parse(readFileSync(process.env.QA_IDENTITY_FILE,'utf8')),f=JSON.parse(readFileSync(process.env.QA_BOOKING_FIXTURE,'utf8'));
if(p.api!=='https://api-dev.kalend.tech'||p.web!=='https://dev.kalend.tech'||f.database!=='kalend_dev')throw Error('DEV_QA_REQUIRED');
let browser,c;const results=[];function must(v,code){if(!v)throw Error(code);}
try{
 const a=p.accounts.find(a=>a.role==='OWNER_A'),A=f.companies.find(c=>c.label==='A');must(A.slug.startsWith('qa-booking-'),'QA_REQUIRED');c=await request.newContext({extraHTTPHeaders:{Origin:p.web}});must((await c.post(p.api+'/auth/login',{data:{email:a.email,password:a.password}})).ok(),'LOGIN');must((await c.post(p.api+'/auth/tenant',{data:{companyId:A.id}})).ok(),'TENANT');
 browser=await chromium.launch({headless:true});const context=await browser.newContext({storageState:await c.storageState(),viewport:{width:390,height:844}}),page=await context.newPage();
 const expected={light:{gold:'#805a10',ocean:'#1d4ed8',emerald:'#047857',rose:'#be185d',violet:'#6d28d9'},dark:{gold:'#e6bf67',ocean:'#93c5fd',emerald:'#6ee7b7',rose:'#f9a8d4',violet:'#c4b5fd'}};
 for(const theme of ['light','dark']){
  await page.goto(p.web+'/conta/configuracoes/aparencia');await page.locator('.k-palette-control select').waitFor();
  const button=page.getByRole('button',{name:theme==='light'?'Ativar modo claro':'Ativar modo escuro',exact:true});if(await button.count())await button.first().click();
  for(const palette of Object.keys(expected[theme])){
   await page.locator('.k-palette-control select').selectOption(palette);
   const color=await page.locator('.kalend-ui').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--kalend-primary').trim());must(color===expected[theme][palette],`PALETTE_${theme}_${palette}`);results.push({name:`palette_${theme}_${palette}`,status:'PASS'});
  }
 }
 await page.reload();await page.locator('.k-palette-control select').waitFor();must(await page.locator('.k-palette-control select').inputValue()==='violet','PALETTE_NOT_PERSISTED');
 await page.goto(p.web+'/painel/proprietario');await page.getByRole('heading',{name:'Painel do proprietário',exact:true}).waitFor();await page.locator('.k-ops-service-list').waitFor();await page.evaluate(()=>scrollTo(0,600));
 const geometry=await page.evaluate(()=>({header:document.querySelector('.k-admin-header').getBoundingClientRect().top,bottom:document.querySelector('.k-mobile-bottom').getBoundingClientRect().bottom,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));must(geometry.header===0&&Math.abs(geometry.bottom-geometry.viewport)<2&&!geometry.overflow,'FIXED_MOBILE_BARS');
 results.push({name:'mobile_fixed_top_bottom_navigation_and_persisted_palette',status:'PASS'});await page.screenshot({path:'/tmp/kalend-palette-mobile.png',fullPage:false});
 await page.setViewportSize({width:1366,height:900});must(await page.locator('.k-mobile-bottom').evaluate(el=>getComputedStyle(el).display)==='none','MOBILE_NAV_ON_DESKTOP');results.push({name:'desktop_navigation_preserved',status:'PASS'});
}catch(e){results.push({name:'palettes_mobile_dev',status:'FAIL',code:e instanceof Error?e.message:'UNKNOWN'});process.exitCode=1;}
finally{await browser?.close();if(c){await c.post(p.api+'/auth/logout').catch(()=>{});await c.dispose();}}
console.log(JSON.stringify({environment:'DEV',results},null,2));
