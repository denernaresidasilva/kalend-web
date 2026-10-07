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
  mocks = { "@/components/evolution-settings": { EvolutionSettings: () => null }, "@/components/email-settings": { EmailSettings: () => null }, "@/components/notification-center": {NotificationCenter:()=>null}, "@/components/notification-bell": {NotificationBell:()=>null}, ...mocks };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id);
      return load(['.ts','.tsx'].map(ext => base + ext).find(file => fs.existsSync(file)), mocks, globals);
    }
    return require(id);
  }, process: { env: {} }, setTimeout, clearTimeout, URL, AbortController, console, Error, ...globals }, { filename: file });
  return loaded.exports;
}
function nodes(tree, predicate) {
  const result = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (predicate(node)) result.push(node); React.Children.toArray(node.props?.children).forEach(visit); }
  visit(tree); return result;
}
const link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);

function profile(role='OWNER',extra={}) {
  return {user:{id:'account-user',name:'Maria Silva',email:'maria@example.invalid',isSuperAdmin:role==='SUPER_ADMIN'},systemRole:role==='SUPER_ADMIN'?'SUPER_ADMIN':'USER',selectedCompanyId:role==='SUPER_ADMIN'?null:'company-2',memberships:role==='SUPER_ADMIN'?[]:[{id:'membership-1',role,company:{id:'company-1',name:'Empresa anterior'}},{id:'membership-2',role,company:{id:'company-2',name:'Empresa selecionada'}}],session:{expiresAt:'2030-01-01T12:00:00Z',refreshExpiresAt:'2030-01-02T12:00:00Z'},...extra};
}
function harness(options={}) {
  const states=[];let cursor=0;const effects=[];let currentSection='perfil';
  const auth={profile:profile(),loading:false,error:'',reload:async()=>auth.profile,logout:async()=>{},...options.auth};
  const redirects=[];const calls=[];
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];},useEffect(fn){effects.push(fn);},useSyncExternalStore(){return currentSection;}};
  const mocks={
    react:hooks,'next/link':link,'next/navigation':{useRouter:()=>({replace:path=>redirects.push(path)})},
    '@/components/auth-provider':{useAuth:()=>auth},
    '@/components/super-admin/admin-shell':{AdminShell:({children})=>children},
    '@/components/push-settings':{PushSettings:()=>null},
    '@/components/regularization-panel':{RegularizationPanel:()=>null},
    '@/components/theme/theme-control':{ThemeControl:()=>null},
    '@/components/ui/drawer':{Drawer:()=>null},
    '@/lib/account-session':{logoutAllSessions:options.logoutAll||async function(){calls.push('logout-all');}},
    '@/lib/company-selection':{accountDestination:()=>'/painel/proprietario',linkedCompanies:p=>p.memberships,selectCompany:async(_p,id)=>{calls.push(['tenant',id]);if(options.selectError)throw Error('Não foi possível selecionar a empresa.');auth.profile={...auth.profile,selectedCompanyId:id};}},
  };
  mocks['./auth-provider'] = mocks['@/components/auth-provider'];
  const exported={...load('app/conta/page.tsx',mocks),...load('components/account-content.tsx',mocks),...load('components/account-settings.tsx',mocks,{window:{confirm:()=>options.confirm?.() ?? true}})};
  return {auth,redirects,calls,settings(){cursor=0;return exported.AccountSettings({section:currentSection});},section(value){currentSection=value;},render(outer=false){cursor=0;return outer?exported.default():exported.AccountContent({profile:auth.profile,reload:auth.reload,logout:auth.logout});},effects(){return effects.splice(0).map(fn=>fn());}};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('account loads only the current AuthProvider identity, with pending/error/expired states',async()=>{
 const h=harness();const entry=h.render(true);assert.equal(entry.props.profile,h.auth.profile);assert.equal(entry.key,'account-user');
 h.auth.loading=true;assert.match(renderToStaticMarkup(h.render(true)),/Verificando sessão/);
 h.auth.loading=false;h.auth.error='Falha ao verificar sessão.';let retries=0;h.auth.reload=async()=>retries++;
 const failed=h.render(true);assert.match(renderToStaticMarkup(failed),/role="alert"/);await nodes(failed,n=>n.props.children==='Tentar novamente')[0].props.onClick();assert.equal(retries,1);
 h.auth.error='';h.auth.profile=null;const expired=renderToStaticMarkup(h.render(true));assert.match(expired,/sessão não está ativa/);assert.match(expired,/href="\/"/);assert.doesNotMatch(expired,/maria@example/);
});

test('profile displays real read-only name/email, selected company and initials',()=>{
 const {AccountProfile}=load('components/account-profile.tsx');const html=renderToStaticMarkup(React.createElement(AccountProfile,{profile:profile()}));
 assert.match(html,/Maria Silva/);assert.match(html,/maria@example.invalid/);assert.match(html,/>MS</);assert.match(html,/Empresa selecionada/);assert.doesNotMatch(html,/Empresa anterior/);assert.match(html,/somente para consulta/);assert.doesNotMatch(html,/<input|<form|type="file"|Telefone/);
});

test('uncontracted avatar or phone never produces a fake upload or external photo',()=>{
 const {AccountProfile}=load('components/account-profile.tsx');const p=profile();p.user.avatarUrl='https://uncontracted.example.invalid/photo.svg';p.user.phone='123456';
 const html=renderToStaticMarkup(React.createElement(AccountProfile,{profile:p}));assert.doesNotMatch(html,/<img|uncontracted|123456|type="file"/);assert.match(html,/alteração de foto ainda não está disponível/);
});

test('avatar handles absent/blank names and Unicode initials without inventing a photo',()=>{
 const {userInitials}=load('lib/user-avatar.ts');assert.equal(userInitials(''),'?' );assert.equal(userInitials('  Maria   Silva  '),'MS');assert.equal(userInitials('Érica Ávila'),'ÉÁ');
});

for(const role of ['SUPER_ADMIN','OWNER','ADMIN','PROFESSIONAL','RECEPTIONIST','CLIENT'])test(`account respects ${role} global/tenant context and billing access`,()=>{
 const h=harness({auth:{profile:profile(role)}});const tree=h.render();
 const profileNode=nodes(tree,n=>n.type?.name==='AccountProfile')[0];assert.equal(profileNode.props.profile,h.auth.profile);
 const items=tree.props.navigationConfig.groups[0].items;assert.equal(items.some(i=>i.href==='/super-admin'),role==='SUPER_ADMIN');
 assert.equal(nodes(tree,n=>n.type?.name==='RegularizationPanel').length,['OWNER','ADMIN'].includes(role)?1:0);
 const {AccountProfile}=load('components/account-profile.tsx');const html=renderToStaticMarkup(React.createElement(AccountProfile,{profile:profile(role)}));assert.match(html,role==='SUPER_ADMIN'?/acesso global/:/Empresa selecionada/);
});

test('unselected sole-company account never chooses automatically, reuses explicit selector',async()=>{
 const p=profile('CLIENT');p.memberships=p.memberships.slice(0,1);p.selectedCompanyId=null;
 const h=harness({auth:{profile:p}});h.render();h.effects();await tick();assert.deepEqual(h.calls,[]);
 const selector=nodes(h.render(),n=>n.type?.name==='CompanySelector')[0];assert.equal(selector.props.allowSingle,true);await selector.props.select('company-1');assert.equal(h.auth.profile.selectedCompanyId,'company-1');assert.deepEqual(h.calls,[['tenant','company-1']]);
});

test('company selection error preserves server identity and exposes accessible feedback',async()=>{
 const h=harness({selectError:true});h.render();h.effects();const selector=nodes(h.render(),n=>n.type?.name==='CompanySelector')[0];await selector.props.select('company-1');assert.equal(h.auth.profile.selectedCompanyId,'company-2');assert.match(h.render().props.error,/Não foi possível selecionar/);
});

test('security exposes real session actions but no unsupported password form',()=>{
 const {AccountSecurity}=load('components/account-security.tsx');const html=renderToStaticMarkup(React.createElement(AccountSecurity,{profile:profile(),leaving:false,onLogout(){},onLogoutAll(){}}));
 assert.match(html,/Alterar senha/);assert.match(html,/ainda não está disponível/);assert.match(html,/Sair de todos/);assert.doesNotMatch(html,/<input|<form|type="password"/);
});

test('logout-all calls the official endpoint without user, role or tenant; clears only after success',async()=>{
 const calls=[];let cleared=0;const {logoutAllSessions}=load('lib/account-session.ts',{'./api':{api:async(...args)=>calls.push(args),endSession:()=>cleared++}});
 await logoutAllSessions();assert.equal(calls[0][0],'/auth/logout-all');assert.deepEqual(Object.keys(calls[0][1]),['method']);assert.equal(calls[0][1].method,'POST');assert.equal(cleared,1);
 const failure=load('lib/account-session.ts',{'./api':{api:async()=>{throw Error('Falha do backend');},endSession:()=>cleared++}});await assert.rejects(failure.logoutAllSessions(),/Falha do backend/);assert.equal(cleared,1);
});

test('security moved to Settings preserves confirmation and blocks duplicate logout-all',async()=>{
 let finish, allowed=false, mutations=0;
 const h=harness({confirm:()=>allowed,logoutAll:async()=>{mutations++;await new Promise(resolve=>finish=resolve);}});h.section('seguranca');
 let panel=nodes(h.settings(),n=>n.type?.name==='AccountSecurity')[0];
 panel.props.onLogoutAll();assert.equal(mutations,0);
 allowed=true;panel.props.onLogoutAll();panel.props.onLogoutAll();assert.equal(mutations,1);
 finish();await tick();assert.deepEqual(h.redirects,['/']);
});
test('settings failed logout-all keeps the session and allows retry',async()=>{
 const h=harness({logoutAll:async()=>{throw Error('Não foi possível encerrar a sessão.');}});h.section('seguranca');
 nodes(h.settings(),n=>n.type?.name==='AccountSecurity')[0].props.onLogoutAll();await tick();
 assert.match(renderToStaticMarkup(h.settings()),/Não foi possível encerrar/);assert.deepEqual(h.redirects,[]);
});
test('account preferences link to Settings without duplicating channel configuration',()=>{
 for(const role of ['OWNER','SUPER_ADMIN']) {
 const h=harness({auth:{profile:profile(role)}});h.section('preferencias');
 const html=renderToStaticMarkup(h.render());assert.match(html,role==='SUPER_ADMIN'?/super-admin\/configuracoes/:/conta\/configuracoes/);assert.doesNotMatch(html,/Servidor SMTP|Ativar notificações/);
 }
});

test('section parser accepts only working account sections; shared sidebar marks one active',()=>{
 const {accountSection}=load('lib/account.ts');assert.equal(accountSection('#seguranca'),'seguranca');assert.equal(accountSection('#preferencias'),'preferencias');assert.equal(accountSection('#foreign'),'perfil');
 const h=harness();h.section('seguranca');const config=h.render().props.navigationConfig;
 const {Sidebar}=load('components/super-admin/sidebar.tsx',{'next/link':link,'next/navigation':{usePathname:()=>'/conta'}});const tree=Sidebar({mobile:true,config});const active=nodes(tree,n=>n.props['aria-current']==='page');assert.equal(active.length,1);assert.equal(active[0].props.href,'/conta#seguranca');
});

test('shared account header has one instance, no admin-only actions and uses the same avatar',()=>{
 const {Header}=load('components/super-admin/header.tsx',{'next/link':link,'next/navigation':{usePathname:()=>'/conta'},'@/components/theme/theme-control':{ThemeControl:()=>null}});
 const tree=Header({profile:profile('CLIENT'),onMenu(){},menuOpen:false,logout(){},leaving:false,context:{title:'Minha conta',settingsHref:'/conta#preferencias'}});
 const html=renderToStaticMarkup(tree);assert.match(html,/Minha conta/);assert.match(html,/>MS</);assert.doesNotMatch(html,/Maria Silva|super-admin|Nova empresa/);assert.equal(nodes(tree,n=>n.type==='header').length,1);
});
