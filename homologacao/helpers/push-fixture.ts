import { createHash } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';
import { installFixture } from './fixture';
export async function installPushFixture(context: BrowserContext, options: { local?: boolean; backend?: boolean; stale?: boolean; otherDevice?: boolean; admin?: boolean; registrationFails?: boolean } = {}) {
  const base = await installFixture(context, { admin: options.admin });
  const endpoint = `https://push.example.invalid/${base.company.id}`;
  const hash = createHash('sha256').update(endpoint).digest('hex');
  const key = Buffer.alloc(65, 4).toString('base64url');
  const device = { id: `device-${base.company.id}`, endpointHash: hash, vapidPublicKey: key, environment: 'SANDBOX', label: 'Dispositivo QA', platform: 'WEB', active: true, revokedAt: null, expiresAt: null, authorizations: options.admin ? undefined : [{ active: true, revokedAt: null }] };
  const state = { local: options.local !== false, devices: options.backend === false ? [] : [{ ...device, expiresAt: options.stale ? '2020-01-01' : null }], posts: 0, deletes: 0 };
  if (options.otherDevice) state.devices.push({ ...device, id: 'qa-other-device', endpointHash: 'f'.repeat(64), expiresAt: null });
  await context.exposeBinding('__qaSubscription', async (_, action: string) => {
    if (action === 'subscribe') state.local = true;
    if (action === 'unsubscribe') state.local = false;
    return state.local;
  });
  await context.addInitScript(({ endpoint, key, local }) => {
    const bytes = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const host = (window as unknown as { __qaSubscription: (action: string) => Promise<boolean> }).__qaSubscription;
    const sub = { endpoint, expirationTime: null, options: { applicationServerKey: bytes.buffer }, toJSON: () => ({ endpoint, keys: { p256dh: 'QA-fixture-key', auth: 'QA-fixture-auth' } }), unsubscribe: async () => { await host('unsubscribe'); data.local = false; data.unsubscribes++; return true; } };
    const data = { local, subscribes: 0, unsubscribes: 0, permissionRequests: 0 };
    Object.defineProperty(window, '__qaPush', { value: data });
    // Subscription/provider fixtures only. SW and Notification.permission are native Chrome.
    PushManager.prototype.getSubscription = async () => await host('get') ? sub as unknown as PushSubscription : null;
    PushManager.prototype.subscribe = async () => { data.subscribes++; await host('subscribe'); data.local = true; return sub as unknown as PushSubscription; };
  }, { endpoint, key, local: options.local !== false });
  await context.route('https://api.kalend.invalid/communication/push/public-config', route => route.fulfill({ json: { available: true, publicKey: key, environment: 'SANDBOX' } }));
  await context.route('https://api.kalend.invalid/communication/push/subscriptions**', async route => {
    if (route.request().method() === 'POST') {
      state.posts++;
      if (options.registrationFails) { await route.fulfill({ status: 503, json: {} }); return; }
      const index = state.devices.findIndex(d => d.endpointHash === hash);
      if (index < 0) state.devices.push(device); else state.devices[index] = device;
      await route.fulfill({ status: 201, json: device });
    } else if (route.request().method() === 'DELETE') {
      state.deletes++; await route.fulfill({ status: 204 });
    } else {
      const filter = new URL(route.request().url()).searchParams.get('endpointHash');
      await route.fulfill({ json: state.devices.filter(d => !filter || d.endpointHash === filter) });
    }
  });
  return { ...base, push: state };
}
