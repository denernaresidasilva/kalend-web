import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loginQA, api, origin } from '../helpers/real';
test('DEV-company: criação QA, OWNER, membership, trial e dashboard reais', async ({ page, context }, info) => {
  const { QA_ADMIN_EMAIL: email, QA_ADMIN_PASSWORD: password, QA_EMAIL_DOMAIN: domain, QA_TRIAL_PLAN_ID: planId } = process.env;
  test.skip(process.env.QA_ALLOW_CREATE !== 'true' || !email || !password || !domain || !planId || info.project.name !== 'desktop', 'Criação real exige QA_ALLOW_CREATE, Super Admin QA, domínio/planId e Evolution COMPANY QA isolada.');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain!) || /(^|\.)(invalid|example\.com)$/i.test(domain!)) throw new Error('Domínio remoto QA deve ser controlado e não reservado.');
  const admin = await loginQA(context, email!, password!); expect(admin.systemRole).toBe('SUPER_ADMIN');
  const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const companyName = `QA-E2E-${stamp}`, ownerEmail = `qa+${stamp}@${domain}`, ownerPassword = `QA-${randomUUID()}-aA1!`;
  // Password só em memória. Não salvar ledger com credenciais nem trace remoto.
  const response = await context.request.post(`${api}/companies/manual`, { headers: { Origin: origin }, data: { companyName, slug: companyName.toLowerCase(), ownerName: companyName+' OWNER', ownerEmail, ownerPassword, planId, startWithTrial: true } });
  expect(response.status()).toBe(201); const data = await response.json();
  mkdirSync('homologacao/artifacts/ledger-private', { recursive: true, mode: 0o700 });
  writeFileSync(`homologacao/artifacts/ledger-private/${stamp}.json`, JSON.stringify({ runId: stamp, environment: process.env.QA_MODE, companyId: data.company.id, companyName, userId: data.owner.id, email: ownerEmail, membershipId: data.membership.id, subscriptionId: data.subscription.id, createdAt: new Date().toISOString() }), { mode: 0o600 });
  expect(data.company.name).toBe(companyName); expect(data.membership.role).toBe('OWNER'); expect(data.owner.email).toBe(ownerEmail); expect(data.subscription.status).toBe('TRIALING'); expect(data.subscription.plan.id).toBe(planId);
  expect(Date.parse(data.subscription.trialEndsAt)).toBeGreaterThan(Date.parse(data.subscription.trialStartedAt));
  await loginQA(context, ownerEmail, ownerPassword, data.company.id);
  const entitlement = await context.request.get(`${api}/billing/regularization`); expect(entitlement.status()).toBe(200); expect(await entitlement.json()).toMatchObject({ accessAllowed: true, accessStatus: 'TRIAL_ACTIVE' });
  await page.goto('/painel/proprietario'); await expect(page.locator('.k-admin-shell')).toBeVisible(); await expect(page.locator('.k-trial-expired-modal')).toHaveCount(0);
  expect((await context.request.post(`${api}/auth/logout`, { headers: { Origin: origin }, data: {} })).status()).toBe(204);
  // Não há delete company no contrato atual. Ledger permite retenção/cleanup revisado.
});
