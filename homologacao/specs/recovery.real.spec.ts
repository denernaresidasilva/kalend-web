import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { loginQA, api, origin } from '../helpers/real';
test('DEV-trial-expired: request direto, recovery, URL e reload reais', async ({ page, context }) => {
  const { QA_EXPIRED_OWNER_EMAIL: email, QA_EXPIRED_OWNER_PASSWORD: password, QA_EXPIRED_COMPANY_ID: companyId } = process.env;
  test.skip(!email || !password || !companyId, 'Fixture QA expirada não disponível; nenhuma alteração manual de banco.');
  await context.grantPermissions(['notifications']); await loginQA(context, email!, password!, companyId);
  const response = await context.request.get(`${api}/billing/regularization`); expect(response.status()).toBe(200); const state = await response.json();
  expect(state).toMatchObject({ accessAllowed: false, accessStatus: 'TRIAL_EXPIRED' });
  expect((await context.request.get(`${api}/auth/tenant`)).status()).toBe(403);
  for (const path of ['/painel/proprietario','/conta/planos','/conta/configuracoes/email']) { await page.goto(path); await expect(page.locator('.k-trial-expired-modal')).toBeVisible(); }
  await page.reload(); await expect(page.locator('.k-trial-expired-modal')).toBeVisible();
});
test('DEV-checkout: sandbox em tenant QA expirado', async ({ context }, info) => {
  const { QA_EXPIRED_OWNER_EMAIL: email, QA_EXPIRED_OWNER_PASSWORD: password, QA_EXPIRED_COMPANY_ID: companyId } = process.env;
  test.skip(process.env.QA_ALLOW_CHECKOUT !== 'true' || !email || !password || !companyId || info.project.name !== 'desktop', 'Checkout real exige opt-in QA e provider SANDBOX; não efetua pagamento.');
  await loginQA(context,email!,password!,companyId);
  const state = await (await context.request.get(`${api}/billing/regularization`)).json(); expect(state.accessStatus).toBe('TRIAL_EXPIRED');
  const gateway = state.gateways.find((g: { environment: string; capabilities: { checkout: boolean } }) => g.environment === 'SANDBOX' && g.capabilities.checkout);
  expect(gateway, 'Sem sandbox habilitado; não recorrer a provider PROD').toBeTruthy();
  expect(state.pendingCheckout, 'Fixture deve começar sem cobrança pendente').toBeNull();
  const plan = state.plans.find((p: { monthlyPriceCents: number }) => p.monthlyPriceCents > 0); expect(plan).toBeTruthy();
  const body = { planId: plan.id, gateway: gateway.provider, billingInterval: 'MONTHLY', idempotencyKey: randomUUID(), recurring: false };
  if (gateway.provider === 'ASAAS') test.skip(true, 'CPF/CNPJ QA sandbox específico ainda não fornecido.');
  const response = await context.request.post(`${api}/billing/checkout`, { headers: { Origin: origin }, data: body }); expect(response.ok()).toBe(true); const payment = await response.json(); expect(payment.id).toBeTruthy(); expect(payment.status).toBe('PENDING');
  const replay = await context.request.post(`${api}/billing/checkout`, { headers: { Origin: origin }, data: body }); expect(replay.ok()).toBe(true); expect((await replay.json()).id).toBe(payment.id);
  expect((await context.request.get(`${api}/auth/tenant`)).status()).toBe(403);
});
test('DEV-security: OWNER sem GLOBAL e IDs de tenant B', async ({ context }) => {
  const { QA_OWNER_EMAIL: email, QA_OWNER_PASSWORD: password, QA_OWNER_COMPANY_ID: companyId, QA_OTHER_COMPANY_ID: otherId } = process.env;
  test.skip(!email || !password || !companyId || !otherId, 'Duas empresas QA distintas necessárias.');
  const me = await loginQA(context,email!,password!,companyId); expect(me.systemRole).toBe('USER');
  expect(me.memberships.some((m: { company: { id: string } }) => m.company.id === otherId)).toBe(false);
  expect((await context.request.get(`${api}/companies`)).status()).toBe(403);
  expect((await context.request.post(`${api}/auth/tenant`, { headers: { Origin: origin }, data: { companyId: otherId } })).status()).toBe(403);
  const after = await (await context.request.get(`${api}/auth/me`)).json(); expect(after.selectedCompanyId).toBe(companyId);
});
