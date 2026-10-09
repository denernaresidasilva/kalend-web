#!/usr/bin/env node
// Dry run only: no DB, remote API, DELETE or shell command.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function cleanupPlan(ledger) {
  if (!ledger || !/^[a-zA-Z0-9-]+$/.test(ledger.runId) || !['dev','staging','local'].includes(ledger.environment)) throw new Error('Ledger/run/ambiente inválido');
  if (ledger.companyName !== `QA-E2E-${ledger.runId}` || !ledger.email?.startsWith(`qa+${ledger.runId}@`)) throw new Error('Prefixo/identidade não corresponde ao run');
  for (const field of ['companyId','userId','membershipId','subscriptionId']) if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(ledger[field])) throw new Error(`ID inválido ${field}`);
  return { mode: 'DRY_RUN_ONLY', environment: ledger.environment, runId: ledger.runId, exactIds: { companyId: ledger.companyId, userId: ledger.userId, membershipId: ledger.membershipId, subscriptionId: ledger.subscriptionId }, required: ['Conferir no destino nome/e-mail/IDs e ownership do run','Não excluir usuário compartilhado com outra empresa','Revisar subscriptions/payments/outbox/deliveries dependentes','Usar endpoint administrativo suportado; exclusão company não existe atualmente'], executed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = cleanupPlan(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  if (process.argv[3]) writeFileSync(process.argv[3],JSON.stringify(plan,null,2));
  else console.log(JSON.stringify(plan,null,2));
}
