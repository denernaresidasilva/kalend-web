# Mobile

Camadas: unitário/integração/local não certificam DEV ou staging. Todos os registros usam runId e IDs QA. Pré-condições ausentes resultam NÃO TESTADO.

## MOBILE-01 — Login desktop/tablet/mobile

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer login desktop/tablet/mobile, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## MOBILE-02 — Modal plano desktop/tablet/mobile

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer modal plano desktop/tablet/mobile, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## MOBILE-03 — Configurações desktop/tablet/mobile

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer configurações desktop/tablet/mobile, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## MOBILE-04 — Comunicação desktop/tablet/mobile

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer comunicação desktop/tablet/mobile, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## MOBILE-05 — Checkout desktop/tablet/mobile

Pré-condição: conta OWNER QA, empresa QA e sandbox específico; para GLOBAL, Super Admin QA.
Ação: exercer checkout desktop/tablet/mobile, correlacionando IDs persistidos com request/UI e provider.
Esperado: contrato indicado no nome do cenário; ausência de acesso indevido, duplicidade ou falso delivered.
Evidência: status HTTP, IDs QA/correlation, estado anterior/posterior e screenshot redigido quando seguro. Registrar ambiente e mocks.

## Execução específica

Projetos Playwright desktop1440/tablet768/mobile390. Login, modal, checkout, conta/configurações/notificações sem overflow. Comunicação administrativa precisa Super Admin QA e fixture real de delivery; dimensões passando não aprovam envio. Safari/iOS/dispositivo real continuam NÃO TESTADO.
