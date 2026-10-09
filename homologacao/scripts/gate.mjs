import { existsSync } from 'node:fs';
// Critérios indispensáveis de release; ausência de prova real não é ressalva.
export const critical = [
  'AUTENTICACAO-01','EMPRESA-01','EMPRESA-03','EMPRESA-04',
  'TRIAL-01','TRIAL-02','TRIAL-03','TRIAL-07','TRIAL-10','TRIAL-11',
  'POPUP-PLANO-01','POPUP-PLANO-02','POPUP-PLANO-04','POPUP-PLANO-05','POPUP-PLANO-06','POPUP-PLANO-07','POPUP-PLANO-09',
  'CHECKOUT-01','CHECKOUT-04','CHECKOUT-05',
  'PAGAMENTO-01','PAGAMENTO-02','PAGAMENTO-03','PAGAMENTO-04','PAGAMENTO-05','PAGAMENTO-06',
  'WHATSAPP-04','EMAIL-02','EMAIL-04',
  'PUSH-02','PUSH-03','PUSH-04','PUSH-05','PUSH-06','PUSH-07',
  'COMUNICACAO-01','COMUNICACAO-02','COMUNICACAO-03','COMUNICACAO-04','COMUNICACAO-05','COMUNICACAO-06','COMUNICACAO-07',
  'SEGURANCA-01','SEGURANCA-02','SEGURANCA-03','SEGURANCA-04','SEGURANCA-05','SEGURANCA-06','SEGURANCA-07',
  'SCHEDULERS-01','SCHEDULERS-02','SCHEDULERS-03','SCHEDULERS-05','SCHEDULERS-06','SCHEDULERS-07',
  'MOBILE-02','MOBILE-05',
];
export function gate({ checks, rows, incidents, apiSha, webSha }) {
  const blockers = checks.filter(c => c.exitCode !== 0).map(c => `Check ${c.id} falhou (${c.exitCode})`);
  for (const item of incidents.filter(i => i.status === 'OPEN' && i.severity === 'critical')) blockers.push(`${item.id}: ${item.summary}`);
  for (const id of critical) {
    const row = rows.find(r => r.ID === id);
    if (!row || row.STATUS !== 'PASSOU' || !['TESTE DEV REAL','TESTE STAGING REAL'].includes(row['TIPO DE TESTE']) || !row.EVIDÊNCIA || !existsSync(row.EVIDÊNCIA) || row.apiSha !== apiSha || row.webSha !== webSha) blockers.push(`${id}: evidência real desta release ausente`);
  }
  const remaining = rows.filter(r => r.STATUS !== 'PASSOU');
  return { status: blockers.length ? 'REPROVADO' : remaining.length ? 'APROVADO COM RESSALVAS' : 'APROVADO', blockers, remaining: remaining.length };
}
