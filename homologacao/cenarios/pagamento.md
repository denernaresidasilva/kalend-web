# Pagamento

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## PAGAMENTO-01 — Sandbox PENDING

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sandbox pending, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-02 — Sandbox APPROVED

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sandbox approved, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-03 — Sandbox FAILED

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sandbox failed, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-04 — Sandbox OVERDUE

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sandbox overdue, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-05 — Webhook assinado duplicado

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer webhook assinado duplicado, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-06 — Webhook fora de ordem

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer webhook fora de ordem, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-07 — Retry do webhook

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer retry do webhook, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## PAGAMENTO-08 — Idempotência concorrente PostgreSQL

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer idempotência concorrente postgresql, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Gateway sandbox separado e webhook assinado real. Não forjar webhook em DEV. Registrar event ID/hash redigido; replay mesmo ID e FAILED atrasado após APPROVED não desativam acesso. Retry por falha temporária controlada em staging. Nenhuma compra PROD.
