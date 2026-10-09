import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupPlan } from './cleanup-plan.mjs';
const ledger = { runId: '20261009-abcd', environment: 'dev', companyName: 'QA-E2E-20261009-abcd', email: 'qa+20261009-abcd@example.invalid', companyId: '11111111-1111-4111-8111-111111111111', userId: '22222222-2222-4222-8222-222222222222', membershipId: '33333333-3333-4333-8333-333333333333', subscriptionId: '44444444-4444-4444-8444-444444444444' };
test('somente plano de IDs exatos, nenhuma execução', () => { const plan = cleanupPlan(ledger); assert.equal(plan.executed,false); assert.equal(plan.exactIds.companyId,ledger.companyId); });
test('empresa de cliente recusada', () => assert.throws(() => cleanupPlan({ ...ledger, companyName: 'Cliente real' })));
test('QA de outra execução recusada', () => assert.throws(() => cleanupPlan({ ...ledger, email: 'qa+outro@example.invalid' })));
test('produção recusada', () => assert.throws(() => cleanupPlan({ ...ledger, environment: 'prod' })));
test('ID ausente/inespecífico recusado', () => assert.throws(() => cleanupPlan({ ...ledger, companyId: '*' })));
