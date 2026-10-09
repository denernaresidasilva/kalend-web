/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/load-ts.cjs');
function fixture(permission = 'default', queryFails = false) {
  const timers = new Map(); let next = 0, queries = 0;
  const window = new EventTarget(), document = new EventTarget(); document.visibilityState = 'visible';
  const status = new EventTarget(), Notification = { permission };
  const load = loader({}, { window, document, Notification, Event, navigator: { permissions: { query: async () => { queries++; if(queryFails) throw Error('unsupported'); return status; } } }, setInterval: fn => { const id=++next; timers.set(id,fn); return id; }, clearInterval: id => timers.delete(id) });
  return { api: load('lib/push/permission.ts'), timers, Notification, status, window, document, queries: () => queries, tick: () => { for (const fn of timers.values()) fn(); } };
}
test('regra única nunca convida granted, denied ou unsupported', () => { const f=fixture(); assert.equal(f.api.canInvitePush('default'),true); assert.equal(f.api.canInvitePush('default',true),false); for(const p of ['granted','denied','unsupported']) assert.equal(f.api.canInvitePush(p),false); });
test('permission observer é compartilhado e leitura não registra subscription', async () => {
  const f=fixture(); let a=0,b=0,events=0; f.window.addEventListener('kalend:push-permission-changed',()=>events++);
  const stopA=f.api.subscribePushPermission(()=>a++), stopB=f.api.subscribePushPermission(()=>b++);
  await Promise.resolve(); assert.equal(f.queries(),1); assert.equal(f.timers.size,1);
  f.Notification.permission='granted'; f.status.dispatchEvent(new Event('change')); assert.equal(a,1); assert.equal(b,1); assert.equal(events,1);
  f.tick(); assert.equal(events,1); stopA(); assert.equal(f.timers.size,1); stopB(); assert.equal(f.timers.size,0);
});
test('fallback atualiza granted sem Permissions API, sem rede ou consentimento', async () => { const f=fixture('default',true); let changed=0; const stop=f.api.subscribePushPermission(()=>changed++); await Promise.resolve(); f.Notification.permission='granted'; f.tick(); assert.equal(changed,1); assert.equal(f.api.readPushPermission(),'granted'); stop(); });
test('retomada de aba verifica permissão e cleanup funciona em remount', async () => { const f=fixture(); const stop=f.api.subscribePushPermission(()=>{}); await Promise.resolve(); stop(); const second=f.api.subscribePushPermission(()=>{}); await Promise.resolve(); assert.equal(f.timers.size,1); f.document.visibilityState='hidden'; f.Notification.permission='denied'; f.tick(); f.document.visibilityState='visible'; f.document.dispatchEvent(new Event('visibilitychange')); assert.equal(f.api.readPushPermission(),'denied'); second(); assert.equal(f.timers.size,0); });
