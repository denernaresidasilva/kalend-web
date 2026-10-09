# Seguranca

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## SEGURANCA-01 — Tenant A não acessa B

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer tenant a não acessa b, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-02 — OWNER não acessa Super Admin

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer owner não acessa super admin, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-03 — Sem membership bloqueado

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sem membership bloqueado, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-04 — CompanyId manipulado

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer companyid manipulado, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-05 — Allowlist trial expirado

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer allowlist trial expirado, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-06 — Tenant não acessa GLOBAL

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer tenant não acessa global, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-07 — Sessões COMPANY separadas

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer sessões company separadas, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-08 — Mass assignment recusado

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer mass assignment recusado, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-09 — Origin/CSRF/cookies

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer origin/csrf/cookies, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-10 — Rate login

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate login, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-11 — Rate connect

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate connect, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-12 — Rate pairing

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate pairing, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-13 — Rate test message

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate test message, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-14 — Rate checkout

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate checkout, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-15 — Rate webhook

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer rate webhook, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## SEGURANCA-16 — Frontend 429 sem loop

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer frontend 429 sem loop, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Dois contextos QA e companies distintas. A envia companyId B/IDs B, espera 403/404 sem payload privado. OWNER para /companies e GLOBAL espera bloqueio. Sem membership espera 403. Trial expirado normal 403 e recovery conforme papel/Origin. Rate load só local/staging isolado com teto de requests; não bombardear DEV/Evolution. Se rota sem rate definido, documentar lacuna; não presumir cobertura do login.
