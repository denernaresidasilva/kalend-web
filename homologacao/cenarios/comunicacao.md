# Comunicacao

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## COMUNICACAO-01 — Outbox pending→processing→sent

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer outbox pending→processing→sent, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-02 — Sem provider nunca entregue

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sem provider nunca entregue, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-03 — Retry temporário

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer retry temporário, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-04 — Falha definitiva

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer falha definitiva, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-05 — Entrega aparece UI

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer entrega aparece ui, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-06 — Falha aparece UI

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer falha aparece ui, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-07 — Log corresponde businessKey

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer log corresponde businesskey, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-08 — Payload sensível ausente em logs

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer payload sensível ausente em logs, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-09 — Template label português

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer template label português, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-10 — Placeholders obrigatórios e fallback

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer placeholders obrigatórios e fallback, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## COMUNICACAO-11 — HTML/texto/canal correto

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer html/texto/canal correto, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Confrontar lista Outbox/Entregas/Falhas/Logs por outboxId/deliveryId/businessKey. Estados técnicos reais são SENDING/ACCEPTED/RETRY/FAILED/UNCERTAIN/SKIPPED; mapear rótulos pending/processing/sent sem converter ACCEPTED em entrega ao destinatário. Falha provider local não prova indisponibilidade externa real.
