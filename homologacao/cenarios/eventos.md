# Eventos

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## EVENTOS-01 — OWNER_WELCOME gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer owner_welcome gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-02 — TRIAL_STARTED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_started gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-03 — TRIAL_EXPIRING gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_expiring gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-04 — TRIAL_EXPIRED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer trial_expired gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-05 — PAYMENT_PENDING gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer payment_pending gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-06 — PAYMENT_APPROVED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer payment_approved gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-07 — PAYMENT_FAILED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer payment_failed gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-08 — PAYMENT_OVERDUE gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer payment_overdue gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-09 — SUBSCRIPTION_GRACE_PERIOD gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer subscription_grace_period gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-10 — SUBSCRIPTION_SUSPENDED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer subscription_suspended gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-11 — SUBSCRIPTION_REACTIVATED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer subscription_reactivated gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-12 — SUBSCRIPTION_CANCELLED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer subscription_cancelled gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## EVENTOS-13 — SECURITY_PASSWORD_CHANGED gatilho→template→destinatário→canal→provider→outbox→status→idempotência

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer security_password_changed gatilho→template→destinatário→canal→provider→outbox→status→idempotência, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Para cada evento: gatilho persistido, businessKey, label PT mantendo enum técnico, variables finais, templateId/version, recipient OWNER correto, canal, provider único, outboxId/deliveryId/status e replay sem duplicação. Trigger SQL não prova entrega; ACCEPTED do provider não prova recebimento. SECURITY_PASSWORD_CHANGED só usuário QA.

## Labels oficiais do frontend

| Evento técnico | Nome em português | Entrega real homologada nesta execução |
|---|---|---|
| OWNER_WELCOME | Boas-vindas ao proprietário | NÃO TESTADO |
| TRIAL_STARTED | Período de teste iniciado | NÃO TESTADO |
| TRIAL_EXPIRING | Período de teste próximo do fim | NÃO TESTADO |
| TRIAL_EXPIRED | Período de teste encerrado | NÃO TESTADO |
| PAYMENT_PENDING | Pagamento pendente | NÃO TESTADO |
| PAYMENT_APPROVED | Pagamento aprovado | NÃO TESTADO |
| PAYMENT_FAILED | Falha no pagamento | NÃO TESTADO |
| PAYMENT_OVERDUE | Pagamento em atraso | NÃO TESTADO |
| SUBSCRIPTION_GRACE_PERIOD | Assinatura em período de tolerância | NÃO TESTADO |
| SUBSCRIPTION_SUSPENDED | Assinatura suspensa | NÃO TESTADO |
| SUBSCRIPTION_REACTIVATED | Assinatura reativada | NÃO TESTADO |
| SUBSCRIPTION_CANCELLED | Assinatura cancelada | NÃO TESTADO |
| SECURITY_PASSWORD_CHANGED | Senha alterada | NÃO TESTADO |
