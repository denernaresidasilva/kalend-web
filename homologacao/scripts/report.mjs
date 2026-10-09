import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { browserCases } from './matrix-results.mjs';
export function summarizeBrowser(out) {
  const load = name => existsSync(resolve(out,name)) ? JSON.parse(readFileSync(resolve(out,name))) : null;
  const local = ['web-playwright.json','web-checkout-annual.json'].map(load).filter(Boolean);
  const dev = load('web-dev-real.json'), staging=load('web-staging-real.json');
  return { localPassed: local.reduce((n,r)=>n+(r.stats?.expected||0),0), localFailed: local.reduce((n,r)=>n+(r.stats?.unexpected||0),0), localDistinctScenarios: browserCases(local).size, devRealPassed: dev?.stats?.expected||0, devRealSkipped: dev?.stats?.skipped||0, stagingRealPassed: staging?.stats?.expected||0 };
}
export function renderResults(result, rows) {
  const table = result.checks.map(c=>`| ${c.id} | ${c.type} | ${c.environment} | ${c.exitCode === 0 ? 'PASSOU' : 'FALHOU'} | [log](${c.evidence}) |`).join('\n');
  const modules = [...new Set(rows.map(r=>r['MÓDULO']))].map(m=>{
    const items=rows.filter(r=>r['MÓDULO']===m);
    return `| ${m} | ${items.filter(r=>r.STATUS==='PASSOU').length} | ${items.filter(r=>r.STATUS==='FALHOU').length} | ${items.filter(r=>r.STATUS==='NÃO TESTADO').length} |`;
  }).join('\n');
  return `# Resultado oficial de homologação\n\n**${result.verdict.status}** — execução ${result.runId}.\n\nAPI ${result.apiSha}; Web ${result.webSha}; Node ${result.node}. Execução no working tree develop, sem commit da suíte; SHAs identificam a base e não certificam arquivos modificados. Evidências: [resultado JSON](evidencias/${result.runId}/resultado-final.json), [matriz](MATRIZ-E2E.csv).\n\n${rows.length} cenários na matriz. Browser: ${JSON.stringify(result.browser)}. Skipped significa NÃO TESTADO.\n\n## Checks executados\n\n| Check | Camada | Ambiente | Resultado | Evidência |\n|---|---|---|---|---|\n${table}\n\n## Matriz por módulo\n\nPASSOU nesta tabela vale apenas para a camada da linha CSV. Nenhum mock certifica provider externo.\n\n| Módulo | PASSOU | FALHOU | NÃO TESTADO |\n|---|---:|---:|---:|\n${modules}\n\n## Bloqueadores\n\n${result.verdict.blockers.map(b=>'- '+b).join('\n')}\n\n## Limites da conclusão\n\nO BUG-01 Push continua aberto por confirmação do usuário DEV. Permission granted controlada passando não encerra a sessão afetada. Não houve compra sandbox real, entrega WhatsApp/e-mail/Push real, criação DEV nesta execução, restart DEV, teste PostgreSQL multirréplica ou implantação staging. Acesso anônimo negado não aprova ataques entre contas QA autenticadas. PGlite e gateway mock validam a camada local. Ver [limitações e escopo](LIMITACOES.md), [checklist](CHECKLIST.md), [proposta staging](STAGING.md) e [diagnóstico futuro](DIAGNOSTICO-PROPOSTA.md).\n\nSem commit, push, deploy, migration, alteração PROD/main ou mudança do relógio da VPS.\n`;
}
