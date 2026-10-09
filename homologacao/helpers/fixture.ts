import type { BrowserContext } from '@playwright/test';
export async function installFixture(context: BrowserContext, options: { offset?: number; authenticated?: boolean; admin?: boolean; membership?: boolean } = {}) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const company = { id: `QA-E2E-${runId}`, name: `QA-E2E-${runId}`, slug: `qa-e2e-${runId}`, status: 'TRIAL', isActive: true };
  const profile = { user: { id: `qa-${runId}`, name: 'OWNER QA', email: `qa+${runId}@example.invalid`, isSuperAdmin: !!options.admin }, systemRole: options.admin ? 'SUPER_ADMIN' : 'USER', selectedCompanyId: options.admin ? null : company.id, memberships: options.membership === false ? [] : [{ id: `membership-${runId}`, role: 'OWNER', company }], session: { expiresAt: '2030-01-01', refreshExpiresAt: '2030-01-02' } };
  const plan = { id: `qa-plan-${runId}`, name: 'Plano QA', code: 'qa', monthlyPriceCents: 9900, yearlyPriceCents: 99000, trialEnabled: true, trialDays: 7, isActive: true, isPublic: true, isFeatured: false, displayOrder: 1, features: [], description: 'Fixture; sem cobrança externa' };
  const state = { offset: options.offset ?? -300000, authenticated: options.authenticated ?? true, approved: false, pending: false, fail: false, checkout: [] as unknown[], calls: [] as string[] };
  await context.route('https://api.kalend.invalid/**', async route => {
    const path = new URL(route.request().url()).pathname;
    state.calls.push(path);
    let data: unknown = []; let status = 200;
    if (path === '/auth/me') { data = profile; if (!state.authenticated) status = 401; }
    else if (path === '/auth/refresh') { data = {}; status = 401; }
    else if (path === '/auth/login') { const body = route.request().postDataJSON(); state.authenticated = body.password === 'QA-valid-password'; status = state.authenticated ? 200 : 401; data = { authenticated: state.authenticated }; }
    else if (path === '/auth/logout') { state.authenticated = false; status = 204; }
    else if (path === '/auth/tenant') { data = profile; }
    else if (path === '/billing/checkout') { state.pending = true; state.checkout.push(route.request().postDataJSON()); data = { id: 'qa-payment', status: 'PENDING', creationState: 'CREATED' }; }
    else if (path === '/plans/public') data = [plan];
    else if (path === '/billing/regularization') {
      const expired = !state.approved && state.offset >= 0;
      status = state.fail ? 503 : 200;
      data = { serverNow: new Date(Date.parse('2026-10-10T12:00:00Z') + state.offset).toISOString(), companyId: company.id, accessAllowed: state.approved || !expired, accessStatus: state.approved ? 'ACTIVE' : expired ? 'TRIAL_EXPIRED' : 'TRIAL_EXPIRING', revalidateAfterMs: 500,
        context: { systemRole: profile.systemRole, role: 'OWNER', commercialApplicable: !options.admin },
        trial: { active: !expired && !state.approved, expired, endsAt: '2026-10-10T12:00:00Z', remainingDays: expired ? 0 : 1 },
        financial: { requiresAction: false, status: state.approved ? 'ACTIVE' : expired ? 'EXPIRED' : 'TRIALING' },
        subscription: { id: 'qa-subscription', status: state.approved ? 'ACTIVE' : expired ? 'EXPIRED' : 'TRIALING', planId: plan.id, planName: plan.name, billingInterval: 'MONTHLY', trialEndsAt: '2026-10-10T12:00:00Z' },
        plans: [plan], gateways: [{ provider: 'STRIPE', environment: 'SANDBOX', capabilities: { checkout: true, recurring: false } }],
        pendingCheckout: state.pending && !state.approved ? { id: 'qa-payment', gateway: 'STRIPE', billingInterval: 'MONTHLY', creationState: 'CREATED', checkoutUrl: 'https://checkout.example.invalid/qa' } : null };
    }
    else if (path === '/communication/push/public-config') data = { available: false, publicKey: null, environment: null };
    else if (path.includes('notifications')) data = path.includes('unread') ? { count: 0 } : { items: [], unreadCount: 0 };
    await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? undefined : JSON.stringify(data) });
  });
  return { state, profile, plan, company };
}
