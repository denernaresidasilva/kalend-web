#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderResults, summarizeBrowser } from './report.mjs';
import { applyLocalEvidence } from './matrix-results.mjs';
import { gate } from './gate.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node22+ necessário; não mudar runtime da VPS.');
const suite = resolve(root, 'kalend-web/homologacao');
const runId = `QA-E2E-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const out = resolve(suite,'evidencias',runId); mkdirSync(out, { recursive: true });
const checks = [];
const realMode = process.argv.includes('--dev') ? 'dev' : process.argv.includes('--staging') ? 'staging' : null;
const csv = value => '"'+String(value ?? '').replaceAll('"','""')+'"';
const sha = repo => spawnSync('git', ['rev-parse','HEAD'], { cwd: resolve(root,repo), encoding: 'utf8' }).stdout.trim();
const apiSha = sha('kalend-api'), webSha = sha('kalend-web');
for (const repo of ['kalend-api','kalend-web']) {
  const branch = spawnSync('git', ['branch','--show-current'], { cwd: resolve(root,repo), encoding: 'utf8' }).stdout.trim();
  if (branch !== 'develop') throw new Error(`${repo}: develop obrigatório, encontrado ${branch}`);
}
console.log(`RUN ${runId} → ${out}`);
async function run(id, repo, command, args, type, env = {}) {
  const path = resolve(out, `${id}.log`), fd = openSync(path, 'w');
  const started = Date.now();
  // Executa apenas comandos locais fixos. Não recebe comando arbitrário, URL ou DB de alvo.
  const child = spawn(command, args, { cwd: resolve(root, repo), env: { ...process.env, PATH: dirname(process.execPath)+':'+process.env.PATH, ...env }, stdio: ['ignore',fd,fd] });
  const code = await new Promise(resolveCode => { child.once('error', e => { writeFileSync(path,e.message); resolveCode(127); }); child.once('close', c => resolveCode(c ?? 1)); });
  closeSync(fd);
  const result = { id, type, environment: id.includes('-dev-') ? 'DEV' : id.includes('-staging-') ? 'STAGING' : 'LOCAL', command: [command,...args], exitCode: code, durationMs: Date.now()-started, evidence: path }; checks.push(result);
  if (id === 'web-playwright' || id.endsWith('-real')) {
    const report = resolve(root,'kalend-web/homologacao/artifacts/playwright.json');
    if (existsSync(report)) copyFileSync(report, resolve(out,`${id}.json`));
  }
  console.log(`${id}: ${code === 0 ? 'PASSOU' : 'FALHOU'} (${result.durationMs}ms)`); return code;
}
const api = async () => {
  await run('api-unit','kalend-api','npm',['test'],'TESTE UNITÁRIO');
  await run('api-e2e','kalend-api','npm',['run','test:e2e'],'TESTE E2E LOCAL (HTTP, persistência mock em vários casos)');
  await run('api-lint','kalend-api','npm',['run','lint'],'CHECK');
  await run('api-types','kalend-api','npx',['--no-install','tsc','--noEmit'],'CHECK');
  const built = await run('api-build','kalend-api','npm',['run','build'],'CHECK');
  await run('api-prisma','kalend-api','npx',['--no-install','prisma','validate'],'CHECK', { DATABASE_URL: 'postgresql://qa:qa@127.0.0.1:55449/qa_disposable' });
  if (!built) await run('api-sql','kalend-api',process.execPath,['scripts/validate-trial-access.mjs'],'TESTE INTEGRAÇÃO (PGlite/HTTP real, gateway mock)');
  if (!built) await run('api-restart','kalend-api',process.execPath,['scripts/validate-restart-recovery.mjs'],'TESTE INTEGRAÇÃO (dois processos, PGlite em disco QA)');
  await run('api-diff','kalend-api','git',['diff','--check'],'CHECK');
};
const web = async () => {
  await run('web-unit','kalend-web','npm',['test'],'TESTE UNITÁRIO/INTEGRAÇÃO DOM');
  await run('web-lint','kalend-web','npm',['run','lint'],'CHECK');
  const built = await run('web-build','kalend-web','npm',['run','build','--','--webpack'],'CHECK', { NEXT_PUBLIC_API_URL: 'https://api.kalend.invalid' });
  await run('web-types','kalend-web','npx',['--no-install','tsc','--noEmit'],'CHECK');
  if (!built) await run('web-playwright','kalend-web','npm',['run','test:homologacao'],'TESTE E2E LOCAL (Chrome real/APIs mock)', { QA_MODE: 'local' });
  if (realMode) await run(`web-${realMode}-real`,'kalend-web','npm',['run','test:homologacao'],'TESTE '+realMode.toUpperCase()+' REAL', { QA_MODE: realMode });
  await run('web-diff','kalend-web','git',['diff','--check'],'CHECK');
};
await Promise.all([api(), web()]);
await run('gate-regression','.',process.execPath,['--test','--experimental-test-isolation=none','kalend-web/homologacao/scripts/gate.test.mjs','kalend-web/homologacao/scripts/cleanup-plan.test.mjs','kalend-web/homologacao/scripts/matrix-results.test.mjs'],'TESTE UNITÁRIO');
const evidenceArg = process.argv.indexOf('--real-evidence');
const rows = JSON.parse(readFileSync(resolve(suite,'cenarios.json')));
applyLocalEvidence(rows,out,checks);
if (evidenceArg >= 0) {
  const imported = JSON.parse(readFileSync(resolve(process.argv[evidenceArg+1])));
  for (const evidence of imported) {
    const row = rows.find(r => r.ID === evidence.ID);
    if (!row) throw new Error(`Cenário desconhecido ${evidence.ID}`);
    Object.assign(row, evidence);
  }
}
const incidents = JSON.parse(readFileSync(resolve(suite,'incidentes.json')));
if (incidents.some(i=>i.id==='BUG-01' && i.status==='OPEN')) Object.assign(rows.find(r=>r.ID==='PUSH-04'), { STATUS:'FALHOU', 'RESULTADO REAL':'Incidente DEV confirmado pelo usuário e ainda aberto; sessão afetada não reproduzida nesta execução', 'EVIDÊNCIA':resolve(root,'auditoria-2026-10-09/RELATORIO.md'), 'OBSERVAÇÃO':'granted controlado passando não encerra BUG-01' });
const verdict = gate({ checks, rows, incidents, apiSha, webSha });
const results = { browser: summarizeBrowser(out), runId, timestamp: new Date().toISOString(), node: process.version, apiSha, webSha, checks, verdict, note: 'Nenhum cenário real promovido por testes locais. Matriz deve ser revisada com evidências individuais.' };
const fields = ['ID','MÓDULO','CENÁRIO','TIPO DE TESTE','AMBIENTE','PRÉ-CONDIÇÃO','AÇÃO','RESULTADO ESPERADO','RESULTADO REAL','STATUS','EVIDÊNCIA','OBSERVAÇÃO'];
writeFileSync(resolve(out,'MATRIZ-E2E.csv'), fields.join(',')+'\n'+rows.map(row=>fields.map(field=>csv(row[field])).join(',')).join('\n')+'\n');
writeFileSync(resolve(out,'resultado.json'), JSON.stringify(results,null,2));
writeFileSync(resolve(out,'resultado-final.json'), JSON.stringify(results,null,2));
writeFileSync(resolve(suite,'RESULTADOS.md'), renderResults(results,rows));
writeFileSync(resolve(suite,'ultima-execucao.json'), JSON.stringify(results,null,2));
console.log(JSON.stringify(verdict,null,2)); process.exitCode = verdict.status === 'REPROVADO' ? 1 : 0;
