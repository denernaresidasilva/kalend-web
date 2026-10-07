/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}, globals = {}) {
  mocks = { "@/components/email-settings": { EmailSettings: ({ scope }) => React.createElement("section", null, React.createElement("h2", null, "E-mail"), React.createElement("p", null, scope === "SYSTEM" ? "E-mail do Sistema" : "E-mail da empresa")) }, "@/components/notification-center": {NotificationCenter:()=>null}, "@/components/notification-bell": {NotificationBell:()=>null}, ...mocks };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id);
      return load(['.ts','.tsx'].map(ext => base + ext).find(file => fs.existsSync(file)), mocks, globals);
    }
    return require(id);
  }, setTimeout, clearTimeout, URL, AbortController, console, ...globals }, { filename: file });
  return loaded.exports;
}
function nodes(tree, predicate) {
  const result = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (predicate(node)) result.push(node); React.Children.toArray(node.props?.children).forEach(visit); }
  visit(tree); return result;
}
const link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
const plan = (extra = {}) => ({ id: 'plan', name: 'Plano do catálogo', description: 'Descrição real', monthlyPriceCents: 10000, yearlyPriceCents: 100000, isFeatured: true, badge: 'Destaque editorial', trialEnabled: true, trialDays: 7, maxProfessionals: 5, maxClients: null, maxUnits: 1, maxMessages: 500, features: [{ id: 'feature', name: 'Recurso real', enabled: true }], ...extra });
const profile = role => ({ systemRole: 'USER', user: { id: 'user' }, selectedCompanyId: 'company', memberships: [{ role, company: { id: 'company' } }] });
const regularization = (extra = {}) => ({ serverNow: '2026-10-01T12:00:00Z', context:{companyId:'company',role:'OWNER'}, ...extra, trial: { active:true,endsAt:'2026-10-04T12:00:00Z',remainingDays:3,expired:false,...extra.trial }, financial: { requiresAction:false,status:'ACTIVE',...extra.financial } });

test('theme resolves light/dark/system and stores only the visual preference', () => {
  const theme = load('lib/theme.ts'); const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
  assert.equal(theme.readTheme(storage), 'dark');
  for (const preference of ['light','dark','system']) { theme.persistTheme(storage, preference); assert.equal(theme.readTheme(storage), preference); }
  assert.deepEqual([...values.keys()], ['kalend:theme']);
  assert.equal(theme.resolvedTheme('light',true),'light'); assert.equal(theme.resolvedTheme('dark',false),'dark');
  assert.equal(theme.resolvedTheme('system',true),'dark'); assert.equal(theme.resolvedTheme('system',false),'light');
  assert.equal(theme.themePreference('unexpected'),'dark');
  assert.equal(theme.readTheme({ getItem() { throw Error('blocked'); } }), 'dark');
  assert.doesNotThrow(() => theme.persistTheme({ setItem() { throw Error('blocked'); } }, 'dark'));
});

test('semantic text and control colors meet contrast thresholds in both themes', () => {
  const css=fs.readFileSync('app/styles/kalend-tokens.css','utf8');
  const luminance=hex=>{const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
  for(const block of [css.slice(0,css.indexOf('html[data-theme')),css.slice(css.indexOf('html[data-theme'))]) {
    const tokens=Object.fromEntries([...block.matchAll(/--kalend-([\w-]+): (#[a-fA-F0-9]{6});/g)].map(m=>[m[1],m[2]]));
    for(const [a,b,minimum] of [['text-primary','surface',4.5],['text-secondary','surface',4.5],['text-muted','surface',4.5],['on-primary','primary',4.5],['primary','primary-soft',4.5],['control-border','surface',3]]) {
      const [low,high]=[luminance(tokens[a]),luminance(tokens[b])].sort((x,y)=>x-y);assert.ok((high+.05)/(low+.05)>=minimum,`${a} on ${b}`);
    }
  }
});

test('pre-paint theme bootstrap follows OS changes, manual preference and other tabs', () => {
  const { themeScript } = load('lib/theme.ts'); const dataset = {}; const events = {}; const media = { matches: true, addEventListener: (_event,listener) => events.media = listener };
  vm.runInNewContext(themeScript, { document: { documentElement: { dataset } }, localStorage: { getItem: () => null }, matchMedia: () => media, addEventListener: (event,listener) => events[event] = listener });
  assert.equal(dataset.theme,'dark'); media.matches = false; events.media(); assert.equal(dataset.theme,'dark');
  events.storage({ key: 'kalend:theme', newValue: 'dark' }); assert.equal(dataset.theme,'dark');
  media.matches = false; events.media(); assert.equal(dataset.theme,'dark');
  dataset.themePreference = 'light'; events['kalend:theme'](); assert.equal(dataset.theme,'light');
  events.storage({ key:'kalend:theme', newValue:'system' }); media.matches = true; events.media(); assert.equal(dataset.theme,'dark');
});

test('navigation activates exactly the relevant destination including descendants', () => {
  const { navigation, activeDestination } = load('components/super-admin/navigation.ts');
  assert.equal(navigation.flatMap(group => group.items).length,9);
  for (const route of ['/super-admin','/super-admin/empresas/nova','/super-admin/configuracoes/pagamentos/PAGBANK','/super-admin/planos/novo']) assert.equal(navigation.flatMap(group => group.items).filter(item => activeDestination(route,item.href)).length,1);
  const { Sidebar } = load('components/super-admin/sidebar.tsx', { 'next/link':link, 'next/navigation': { usePathname: () => '/super-admin/planos/novo' } });
  const tree = Sidebar({ mobile: true }); const active = nodes(tree,n => n.props['aria-current'] === 'page');
  assert.equal(active.length,1); assert.equal(active[0].props.href,'/super-admin/planos');
});

test('drawer keyboard wraps focus in both directions', () => {
  const document = { activeElement: null }; const { trapDrawerFocus } = load('lib/drawer.ts',{}, { document });
  const first = { focus: () => document.activeElement = first }; const last = { focus: () => document.activeElement = last }; const panel = { focus: () => document.activeElement = panel };
  let prevented = 0; const event = shiftKey => ({ key:'Tab',shiftKey,preventDefault: () => prevented++ });
  document.activeElement = last; trapDrawerFocus(event(false),[first,last],panel); assert.equal(document.activeElement,first);
  trapDrawerFocus(event(true),[first,last],panel); assert.equal(document.activeElement,last);
  trapDrawerFocus(event(false),[],panel); assert.equal(document.activeElement,panel); assert.equal(prevented,3);
});

test('drawer opens modally, locks scrolling, handles Escape and restores previous focus', () => {
  let opened = 0, closed = 0, returned = 0, dismissed = 0; const effects = []; const handlers = {};
  const trigger = { focus: () => returned++ }; const panel = { showModal: () => opened++, close: () => closed++, querySelector: () => ({ focus() {} }), addEventListener: (type,listener) => handlers[type] = listener, removeEventListener: type => delete handlers[type] };
  let ref = 0; const document = { body: { style: { overflow:'auto' } }, activeElement: trigger };
  const { Drawer } = load('components/ui/drawer.tsx', { react: { ...React, useRef: value => ({ current: ref++ === 0 ? panel : value }), useEffect: fn => effects.push(fn) }, 'react-dom': { createPortal: element => element } }, { document });
  const element = Drawer({ open:true,onClose: () => dismissed++,label:'Menu',children:null });
  const cleanups = effects.map(fn => fn()); assert.equal(opened,1); assert.equal(document.body.style.overflow,'hidden');
  let prevented = false; element.props.onCancel({ preventDefault: () => prevented = true }); assert.equal(dismissed,1); assert.equal(prevented,true);
  assert.equal(element.props['aria-label'],'Menu'); assert.equal(element.props['aria-modal'],'true');
  cleanups.forEach(fn => fn?.()); assert.equal(closed,1); assert.equal(returned,1); assert.equal(document.body.style.overflow,'auto');
});

test('accessible loading, alert and disabled button states', () => {
  const { Button } = load('components/ui/button.tsx'); const button = Button({ loading:true,children:'Salvar' });
  assert.equal(button.props.disabled,true); assert.equal(button.props['aria-busy'],true); assert.equal(button.props.type,'button');
  const { Alert } = load('components/ui/alert.tsx'); assert.equal(Alert({ tone:'danger',children:'Erro' }).props.role,'alert');
  const { Loading } = load('components/ui/loading.tsx'); assert.equal(Loading({}).props.role,'status');
});

test('annual savings and unavailable prices use actual catalog values', () => {
  const { annualSaving, annualAvailable, selectPlanInterval, planLimit } = load('lib/plan-presentation.ts');
  const saving = annualSaving(plan()); assert.equal(saving.cents,20000); assert.equal(saving.percent,16);
  for (const price of [null,0,-1,120000,130000]) assert.equal(annualSaving(plan({ yearlyPriceCents:price })),null);
  for (const price of [NaN,Infinity,1.5,-1,0]) assert.equal(annualSaving(plan({monthlyPriceCents:price})),null);
  for (const price of [NaN,Infinity,1.5]) assert.equal(annualSaving(plan({yearlyPriceCents:price})),null);
  assert.equal(annualAvailable(plan({ yearlyPriceCents:0 })),false);
  assert.equal(selectPlanInterval(plan({ yearlyPriceCents:null }),'YEARLY'),'MONTHLY');
  assert.equal(planLimit(undefined),'Não informado'); assert.equal(planLimit(null),'Sem limite definido'); assert.equal(planLimit(0),'0');
});

test('trial dates alone cannot establish remaining days or override server expiration', () => {
  const { commercialDestination } = load('lib/commercial-navigation.ts', { './api':{} });
  // Subscription dates cannot override the explicit backend decision.
  for (const day of [3,2,1,0]) {
    const subscription={status:'TRIALING',trialStartedAt:'2026-09-01T00:00:00Z',trialEndsAt:`2026-10-0${day+1}T00:00:00Z`};
    assert.equal(commercialDestination(regularization({subscription,financial:{status:'TRIALING'}}),'/conta'),'/conta');
    assert.equal(commercialDestination(regularization({subscription,trial:{expired:true},financial:{status:'EXPIRED'}}),'/conta'),'/planos');
  }
});

test('settings hub separates real destinations without claiming provider connections', () => {
  const Page=load('app/super-admin/configuracoes/page.tsx',{'next/link':link,'@/components/theme/theme-control':{ThemeControl:()=>null}}).default;
  const html=renderToStaticMarkup(React.createElement(Page));
  for(const name of ['WhatsApp','E-mail','Push','Notificações','Pagamentos','Aparência','Integrações','Webhooks','Segurança']) assert.match(html,new RegExp(`<h2>${name}</h2>`));
  assert.doesNotMatch(html,/<h2>Conta<\/h2>|<h2>Empresa<\/h2>|Conectado|Configurado/);
  for (const section of ["whatsapp", "email", "push", "notificacoes", "pagamentos", "aparencia", "integracoes", "webhooks", "seguranca"]) assert.match(html, new RegExp(`/super-admin/configuracoes/${section}`));
});

test('selecting a plan passes the actual record; unavailable annual choice cannot be selected', () => {
  const { PlanCatalog } = load('components/plans/plan-catalog.tsx', { 'next/link':link }); let selected;
  const tree = PlanCatalog({ plans:[plan(),plan({ id:'monthly', yearlyPriceCents:null })],interval:'YEARLY',onInterval() {},onSelect:value => selected = value, selectedId:'' });
  const radios = nodes(tree,n => n.type === 'input' && n.props.name === 'plan');
  assert.equal(radios[1].props.disabled,true); radios[0].props.onChange(); assert.equal(selected.id,'plan');
  const html = renderToStaticMarkup(tree); assert.match(html,/Recurso real/); assert.match(html,/Destaque editorial/); assert.match(html,/cobrança anual/); assert.doesNotMatch(html,/mais vendido|Ilimitado/i);
});

test('financial obligation takes priority over expired trial, with no invented overdue state', () => {
  const { commercialDestination } = load('lib/commercial-navigation.ts', { './api':{} });
  assert.equal(commercialDestination(regularization({financial:{requiresAction:true},trial:{expired:true}}),'/conta'),'/conta/regularizar');
  for (const optional of [{ pendingCheckout:{ id:'upgrade' } },{ financial:{status:'PAST_DUE'} }]) assert.equal(commercialDestination(regularization(optional),'/conta'),'/conta');
  assert.equal(commercialDestination(regularization({ trial:{expired:true},pendingCheckout:{id:'payment'} }),'/conta'),'/planos');
  assert.equal(commercialDestination(regularization({ trial:{expired:true},financial:{status:'EXPIRED'} }),'/conta'),'/planos');
  assert.equal(commercialDestination(regularization(),'/conta'),'/conta');
  assert.equal(commercialDestination(regularization({ subscription:{ trialEndsAt:'2000-01-01' } }),'/conta'),'/conta');
});

test('login destinations honor every role and keep Super Admin separate', async () => {
  const calls = []; let result = regularization();
  const { loginDestination } = load('lib/commercial-navigation.ts', { './api': {}, './commercial-state': { getCommercialState: async (company,user) => { calls.push([company,user]); return result; } } });
  assert.equal(await loginDestination({ ...profile('OWNER'),systemRole:'SUPER_ADMIN' }),'/super-admin'); assert.equal(calls.length,0);
  for (const role of ['OWNER','ADMIN','PROFESSIONAL','RECEPTIONIST','CLIENT']) assert.equal(await loginDestination(profile(role)),({OWNER:'/painel/proprietario',ADMIN:'/painel/proprietario',PROFESSIONAL:'/painel/profissional',RECEPTIONIST:'/painel/recepcionista',CLIENT:'/painel/cliente'})[role]);
  assert.equal(calls.length,5);
  result = regularization({trial:{expired:true}}); assert.equal(await loginDestination(profile('OWNER')),'/planos');
  result = regularization({financial:{requiresAction:true},trial:{expired:true}}); assert.equal(await loginDestination(profile('OWNER')),'/conta/regularizar');
});

test('public LP reloads the real catalog with no cookies or authentication refresh', async () => {
  const state = []; let index = 0; const calls = []; let data = [plan({ name:'Plano A',monthlyPriceCents:4900,isActive:true,isPublic:true })];
  const hooks = { ...React,useState:initial => { const i=index++; if (!(i in state)) state[i]=initial; return [state[i],value => state[i]=value]; },useCallback:fn => fn,useEffect() {} };
  const { PublicPlans } = load('components/plans/public-plans.tsx', { react:hooks,'next/link':link,'@/lib/api':{ API_URL:'https://catalog.example' },'@/components/theme/theme-control':{ ThemeControl: () => null } }, { fetch: async (url,init) => { calls.push([url,init]); return { ok:true,json:async () => data }; } });
  function render() { index=0; return PublicPlans(); }
  let tree=render(); await nodes(tree,n => n.type?.name === 'Button')[0].props.onClick(); await new Promise(resolve => setImmediate(resolve)); tree=render();
  let catalog=nodes(tree,n => n.type?.name === 'PlanCatalog')[0]; assert.equal(catalog.props.plans[0].monthlyPriceCents,4900);
  data=[plan({ name:'Plano A',isActive:true,isPublic:true,monthlyPriceCents:7900,yearlyPriceCents:79000,isFeatured:false,badge:'Novo badge' }),plan({ isActive:false,isPublic:true }),plan({isActive:true,isPublic:false})];
  await nodes(tree,n => n.type?.name === 'Button')[0].props.onClick(); await new Promise(resolve => setImmediate(resolve)); tree=render(); catalog=nodes(tree,n => n.type?.name === 'PlanCatalog')[0];
  assert.equal(catalog.props.plans.length,1); assert.equal(catalog.props.plans[0].monthlyPriceCents,7900);
  assert.equal(catalog.props.plans[0].yearlyPriceCents,79000); assert.equal(catalog.props.plans[0].isFeatured,false); assert.equal(catalog.props.plans[0].badge,'Novo badge');
  const html=renderToStaticMarkup(React.createElement(catalog.type,catalog.props)); assert.match(html,/79,00/); assert.match(html,/Novo badge/); assert.match(html,/Plano A/);
  assert.equal(calls[0][0],'https://catalog.example/plans/public'); assert.equal(calls[0][1].credentials,'omit'); assert.equal(calls[0][1].cache,'no-store');
});

test('shared header exposes avatar/account, icon action and real logout', () => {
  let loggedOut = false;
  const { Header } = load('components/super-admin/header.tsx', { 'next/link':link, 'next/navigation':{ usePathname: () => '/super-admin/empresas' }, '@/components/theme/theme-control':{ ThemeControl: () => null } });
  const tree=Header({ profile:{ user:{ name:'Nome autenticado' } },onMenu() {},menuOpen:false,logout() { loggedOut = true; },leaving:false });
  const html=renderToStaticMarkup(tree); assert.match(html,/>NA</); assert.doesNotMatch(html,/Nome autenticado/);
  const account=nodes(tree,node=>node.props['aria-label']==='Minha conta')[0];assert.equal(account.props.href,'/conta');
  const action=nodes(tree,node=>node.props['aria-label']==='Nova empresa')[0];assert.equal(action.props.href,'/super-admin/empresas/nova');assert.equal(action.props.title,'Nova empresa');
  nodes(tree,node=>node.props['aria-label']==='Sair')[0].props.onClick();assert.equal(loggedOut,true);
});

test('status charts preserve backend counts, including zero, and accessible labels', () => {
  const { StatusChart } = load('components/dashboard-charts.tsx');
  const html=renderToStaticMarkup(React.createElement(StatusChart,{title:'Pagamentos',items:[['Aprovados',20],['Pendentes',0],['Falhos',5]]}));
  assert.match(html,/<dt>Aprovados<\/dt><dd><span>20<\/span>/);assert.match(html,/width:100%/);assert.match(html,/width:25%/);assert.match(html,/width:0%/);assert.match(html,/aria-hidden="true"/);
  const empty=renderToStaticMarkup(React.createElement(StatusChart,{title:'Empresas',items:[['Ativas',0]]}));assert.match(empty,/Nenhum registro/);assert.doesNotMatch(empty,/NaN|Infinity/);
});

 test('icon theme control toggles explicit light and dark preferences', () => {
  for (const [preference,label,next] of [['dark','Ativar modo claro','light'],['light','Ativar modo escuro','dark']]) {
    let selected;
    const { ThemeControl }=load('components/theme/theme-control.tsx',{'./theme-provider':{useTheme:()=>({preference,setPreference:value=>selected=value})}});
    const button=ThemeControl();assert.equal(button.props['aria-label'],label);assert.equal(button.props.title,label);button.props.onClick();assert.equal(selected,next);
  }
 });
