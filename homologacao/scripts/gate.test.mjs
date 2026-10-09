import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, critical } from './gate.mjs';
const input = { checks: [], rows: [], incidents: [], apiSha: 'api', webSha: 'web' };
test('unitários verdes não aprovam integrações reais ausentes', () => assert.equal(gate(input).status, 'REPROVADO'));
test('mock PASSOU não pode aprovar gate', () => assert.equal(gate({ ...input, rows: critical.map(ID => ({ ID, STATUS: 'PASSOU', 'TIPO DE TESTE': 'TESTE E2E LOCAL' })) }).status, 'REPROVADO'));
test('BUG crítico aberto bloqueia release', () => assert.ok(gate({ ...input, incidents: [{ id: 'BUG-01', status: 'OPEN', severity: 'critical', summary: 'Push' }] }).blockers.some(b => b.startsWith('BUG-01'))));
test('falha de check sempre bloqueia', () => assert.ok(gate({ ...input, checks: [{ id: 'api-unit', exitCode: 1 }] }).blockers.includes('Check api-unit falhou (1)')));
