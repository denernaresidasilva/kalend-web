import { expect, type BrowserContext } from '@playwright/test';
export const api = process.env.QA_MODE === 'staging' ? 'https://api-staging.kalend.tech' : 'https://api-dev.kalend.tech';
export const origin = process.env.QA_MODE === 'staging' ? 'https://staging.kalend.tech' : 'https://dev.kalend.tech';
export async function loginQA(context: BrowserContext, email: string, password: string, companyId?: string) {
  if (!/^qa\+[^@]+@/.test(email)) throw new Error('Conta não QA proibida.');
  const response = await context.request.post(`${api}/auth/login`, { headers: { Origin: origin }, data: { email, password } }); expect(response.status()).toBe(200);
  if (companyId) expect((await context.request.post(`${api}/auth/tenant`, { headers: { Origin: origin }, data: { companyId } })).status()).toBe(200);
  const meResponse = await context.request.get(`${api}/auth/me`); expect(meResponse.status()).toBe(200);
  const me = await meResponse.json();
  if (companyId) { const membership = me.memberships.find((m: { company: { id: string; name: string } }) => m.company.id === companyId); expect(membership?.company.name).toMatch(/^QA-E2E-/); }
  return me;
}
