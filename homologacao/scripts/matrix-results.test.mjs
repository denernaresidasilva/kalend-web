import test from 'node:test';
import assert from 'node:assert/strict';
import { passedInThreeProjects, browserCases } from './matrix-results.mjs';
const tests = ['desktop','tablet','mobile'].map(projectName=>({ projectName, expectedStatus: 'passed', results: [{ status: 'passed' }] }));
test('exige os três projetos realmente passando', () => assert.equal(passedInThreeProjects(tests),true));
test('skip não é aprovação', () => assert.equal(passedInThreeProjects([...tests.slice(0,2),{...tests[2],expectedStatus:'skipped',results:[{status:'skipped'}]}]),false));
test('projeto ausente não é aprovação', () => assert.equal(passedInThreeProjects(tests.slice(0,2)),false));
test('casos reais e locais não se misturam pelo exit code', () => { const cases=browserCases([{suites:[{specs:[{title:'local-only',tests}]}]}]); assert.equal(passedInThreeProjects(cases.get('DEV-PUSH-granted')),false); });
