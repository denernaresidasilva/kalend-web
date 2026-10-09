# Trial

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## TRIAL-01 — TRIAL_STARTED capturado uma vez

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_started capturado uma vez, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-02 — TRIAL_EXPIRING janela três dias

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_expiring janela três dias, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-03 — TRIAL_EXPIRED capturado uma vez

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_expired capturado uma vez, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-04 — Acesso cinco minutos antes

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer acesso cinco minutos antes, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-05 — Acesso um segundo antes

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer acesso um segundo antes, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-06 — Bloqueio no deadline

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer bloqueio no deadline, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-07 — Bloqueio um segundo depois sem scheduler

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer bloqueio um segundo depois sem scheduler, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-08 — Bloqueio uma hora depois

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer bloqueio uma hora depois, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-09 — Relógio browser incorreto

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer relógio browser incorreto, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-10 — Restart da aplicação sem scheduler

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer restart da aplicação sem scheduler, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## TRIAL-11 — Pagamento restaura entitlement

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer pagamento restaura entitlement, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Automação: trial-access.e2e-spec.ts, validate-trial-access.mjs, core.local.spec.ts. Instantes −5min, −1s, 0, +1s, +1h; cron não executa antes do request pós-deadline. Fake Date só no processo, sem alterar sistema. Eventos persistidos via businessKey, não por request. Testar três dias −1ms/no limite/replay.
