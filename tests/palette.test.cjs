/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const loader = require('./helpers/load-ts.cjs');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
test('palette persists only a validated browser preference and never injects arbitrary values', () => {
 const p = loader()('lib/palette.ts'), values = new Map();
 const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
 for (const value of Object.keys(p.palettes)) { p.persistPalette(storage, value); assert.equal(p.readPalette(storage), value); }
 assert.deepEqual([...values.keys()], ['kalend:palette']);assert.equal(p.paletteValue('constructor'), 'gold');assert.equal(p.paletteValue('red; background:url(https://example.test)'), 'gold');assert.equal(p.readPalette({getItem(){throw Error('blocked');}}),'gold');
 const dataset = {};vm.runInNewContext(p.paletteScript, { localStorage: { getItem: () => 'ocean' }, document: { documentElement: { dataset } } });assert.equal(dataset.palette,'ocean');
});
test('all extra palettes preserve contrast for text on primary and primary-soft in both themes', () => {
 const css = fs.readFileSync('app/styles/kalend-palettes.css','utf8');
 const luminance = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 for (const block of css.split('}').filter(s=>s.trim())) {
  const c=Object.fromEntries([...block.matchAll(/--kalend-([\w-]+): (#[a-fA-F0-9]{6});/g)].map(m=>[m[1],m[2]]));
  for(const [a,b] of [['primary','on-primary'],['primary','primary-soft']]){const [low,high]=[luminance(c[a]),luminance(c[b])].sort((x,y)=>x-y);assert.ok((high+.05)/(low+.05)>=4.5,block);}
 }
});
test('mobile shortcuts use only session-authorized dashboard destinations', () => {
 const { MobileNavigation }=loader({'next/link':({children,href})=>React.createElement('a',{href},children)})('components/bookings/mobile-navigation.tsx');
 for(const [role,path] of [['OWNER','proprietario'],['RECEPTIONIST','recepcionista'],['PROFESSIONAL','profissional'],['CLIENT','cliente']]){
  const html=renderToStaticMarkup(React.createElement(MobileNavigation,{profile:{systemRole:'USER',selectedCompanyId:'A',memberships:[{role,company:{id:'A'}}]}}));assert.match(html,new RegExp(`/painel/${path}#agenda`));assert.doesNotMatch(html,/super-admin/);
 }
});

test('theme and palette bootstraps compose before first paint', () => {
 const load=loader(), { themeScript }=load('lib/theme.ts'), { paletteScript }=load('lib/palette.ts'); const dataset={};
 vm.runInNewContext(themeScript+';'+paletteScript,{document:{documentElement:{dataset}},localStorage:{getItem:key=>key==='kalend:palette'?'emerald':'light'},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}});
 assert.equal(dataset.theme,'light');assert.equal(dataset.palette,'emerald');
});
