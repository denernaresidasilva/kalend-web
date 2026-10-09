import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export function browserCases(reports) {
  const map = new Map();
  function visit(suite) {
    for (const spec of suite.specs || []) {
      const tests = map.get(spec.title) || [];
      tests.push(...spec.tests); map.set(spec.title,tests);
    }
    for (const child of suite.suites || []) visit(child);
  }
  for (const report of reports) for (const suite of report.suites || []) visit(suite);
  return map;
}
export function passedInThreeProjects(tests = []) {
  return ['desktop','tablet','mobile'].every(project => tests.some(t => t.projectName === project && t.expectedStatus === 'passed' && t.results?.length && t.results.every(r => r.status === 'passed')));
}
export function applyLocalEvidence(rows, out, checks) {
  const reports = ['web-playwright.json','web-checkout-annual.json'].map(name=>resolve(out,name)).filter(existsSync).map(path=>JSON.parse(readFileSync(path)));
  const cases = browserCases(reports);
  const browser = {
    'AUTH: login válido, logout, rota protegida': ['AUTENTICACAO-01','AUTENTICACAO-03','AUTENTICACAO-05','MOBILE-01'],
    'AUTH: login inválido': ['AUTENTICACAO-02'],
    'AUTH: sessão expirada': ['AUTENTICACAO-04'],
    'GLOBAL: Super Admin não bloqueado pelo trial': ['AUTENTICACAO-06'],
    'TRIAL-clock--300000: decisão do backend no limite': ['TRIAL-04','POPUP-PLANO-01'],
    'TRIAL-clock--1000: decisão do backend no limite': ['TRIAL-05'],
    'TRIAL-clock-0: decisão do backend no limite': ['TRIAL-06'],
    'TRIAL-clock-1000: decisão do backend no limite': ['TRIAL-07'],
    'TRIAL-clock-3600000: decisão do backend no limite': ['TRIAL-08'],
    'TRIAL-clock-browser: relógio local não autoriza estado': ['TRIAL-09'],
    'TRIAL-auto: vence sem refresh, pagamento restaura': ['POPUP-PLANO-02','POPUP-PLANO-03','POPUP-PLANO-09'],
    'TRIAL-routes: rota direta, reload, nova aba e navegação': ['POPUP-PLANO-04','POPUP-PLANO-05','POPUP-PLANO-06','POPUP-PLANO-07'],
    'CHECKOUT: plano, periodicidade, gateway e pendência': ['POPUP-PLANO-08'],
    'CHECKOUT-annual: preço, plano, referência e chave de intento': ['CHECKOUT-01','CHECKOUT-02','CHECKOUT-03','CHECKOUT-04','MOBILE-05'],
    'MOBILE-layout: /conta/configuracoes': ['MOBILE-03'],
    'PUSH-permission-granted: convite e navegação': ['PUSH-02'],
    'PUSH-permission-denied: convite e navegação': ['PUSH-03'],
  };
  for (const [title, ids] of Object.entries(browser)) {
    if (!passedInThreeProjects(cases.get(title))) continue;
    for (const id of ids) {
      const row = rows.find(r=>r.ID===id); if (!row) continue;
      Object.assign(row, { 'TIPO DE TESTE': 'TESTE E2E LOCAL', AMBIENTE: 'LOCAL', STATUS: 'PASSOU', 'RESULTADO REAL': title+' passou nos três projetos; APIs/gateway mock', 'EVIDÊNCIA': resolve(out,title.startsWith('CHECKOUT-annual') && existsSync(resolve(out,'web-checkout-annual.json')) ? 'web-checkout-annual.json' : 'web-playwright.json'), 'OBSERVAÇÃO': 'Não certifica DEV ou integração externa. Cenário combinado tem evidência local indicada.' });
    }
  }
  const sql = checks.find(c=>c.id==='api-sql');
  if (sql?.exitCode === 0) for (const id of ['TRIAL-01','TRIAL-02','TRIAL-03','TRIAL-04','TRIAL-05','TRIAL-06','TRIAL-07','TRIAL-08','TRIAL-11','CHECKOUT-05']) {
    const row = rows.find(r=>r.ID===id); Object.assign(row, { 'TIPO DE TESTE': 'TESTE INTEGRAÇÃO', AMBIENTE: 'LOCAL PGLITE', STATUS: 'PASSOU', 'RESULTADO REAL': 'SQL/HTTP real descartável; gateway mock; 42 asserções', 'EVIDÊNCIA': sql.evidence, 'OBSERVAÇÃO': 'Não comprova provider real ou multirréplica PostgreSQL.' });
  }
  const restart = checks.find(c=>c.id==='api-restart');
  if (restart?.exitCode === 0) Object.assign(rows.find(r=>r.ID==='TRIAL-10'), { 'TIPO DE TESTE':'TESTE INTEGRAÇÃO', AMBIENTE:'LOCAL PGLITE EM DISCO', STATUS:'PASSOU', 'RESULTADO REAL':'Dois processos; trial persistido expirado sem scheduler; 10 asserções', 'EVIDÊNCIA':restart.evidence, 'OBSERVAÇÃO':'Não houve restart DEV.' });
  const push = {
    'PUSH-01': ['PUSH-A: default mostra convite único; dispensar não força nova inscrição'],
    'PUSH-05': ['PUSH-SW: registro/ready nativos no escopo raiz, sem unregister'],
    'PUSH-06': ['PUSH-granted-backend-missing: permissão não é convite; recuperação só nas configurações'],
    'PUSH-08': ['PUSH-navigation: granted resiste a flags, reload, rota, SPA, nova aba e logout/login'],
    'PUSH-09': ['PUSH-navigation: granted resiste a flags, reload, rota, SPA, nova aba e logout/login', 'PUSH-F: backend antigo sem subscription local não remove outro dispositivo'],
    'PUSH-10': ['PUSH-unsupported: ausência de PushManager não provoca convite ou solicitação'],
  };
  for (const [id,titles] of Object.entries(push)) {
    if (!titles.every(title=>passedInThreeProjects(cases.get(title)))) continue;
    Object.assign(rows.find(r=>r.ID===id), { 'TIPO DE TESTE':'TESTE E2E LOCAL', AMBIENTE:'LOCAL CONTROLADO', STATUS:'PASSOU', 'RESULTADO REAL':titles.join('; '), 'EVIDÊNCIA':resolve(out,'web-playwright.json'), 'OBSERVAÇÃO':'Permissões/SW nativos Chrome; subscriptions/API/device fixtures. Não certifica entrega ou sessão DEV.' });
  }
  return rows;
}
