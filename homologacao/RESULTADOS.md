# Resultado oficial de homologação

**REPROVADO** — execução QA-E2E-2026-10-09T20-21-50-688Z.

API 33a69f16064e8f754fa9df057c23d8eaf49f67e4; Web e2504dc7a813312c949017229d59e3a1143be253; Node v22.23.0. Execução no working tree develop, sem commit da suíte; SHAs identificam a base e não certificam arquivos modificados. Evidências: [resultado JSON](evidencias/QA-E2E-2026-10-09T20-21-50-688Z/resultado-final.json), [matriz](MATRIZ-E2E.csv).

132 cenários na matriz. Browser: {"localPassed":63,"localFailed":0,"localDistinctScenarios":21,"devRealPassed":12,"devRealSkipped":15,"stagingRealPassed":0}. Skipped significa NÃO TESTADO.

## Checks executados

| Check | Camada | Ambiente | Resultado | Evidência |
|---|---|---|---|---|
| api-unit | TESTE UNITÁRIO | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-unit.log) |
| web-unit | TESTE UNITÁRIO/INTEGRAÇÃO DOM | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-unit.log) |
| api-e2e | TESTE E2E LOCAL (HTTP, persistência mock em vários casos) | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-e2e.log) |
| api-lint | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-lint.log) |
| api-types | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-types.log) |
| api-build | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-build.log) |
| api-prisma | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-prisma.log) |
| web-lint | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-lint-final.log) |
| api-sql | TESTE INTEGRAÇÃO (PGlite/HTTP real, gateway mock) | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-sql.log) |
| api-restart | TESTE INTEGRAÇÃO (dois processos, PGlite em disco QA) | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-restart.log) |
| api-diff | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/api-diff.log) |
| web-build | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-build.log) |
| web-types | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-types-final.log) |
| web-playwright | TESTE E2E LOCAL (Chrome real/APIs mock) | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-playwright.log) |
| web-dev-real | TESTE DEV REAL | DEV | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-dev-real.log) |
| web-diff | CHECK | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-diff.log) |
| gate-regression | TESTE UNITÁRIO | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/gate-regression-final.log) |
| web-checkout-annual | TESTE E2E LOCAL | LOCAL | PASSOU | [log](/home/guest/Projetos/Kalend/homologacao/evidencias/QA-E2E-2026-10-09T20-21-50-688Z/web-checkout-annual.json) |

## Matriz por módulo

PASSOU nesta tabela vale apenas para a camada da linha CSV. Nenhum mock certifica provider externo.

| Módulo | PASSOU | FALHOU | NÃO TESTADO |
|---|---:|---:|---:|
| autenticacao | 6 | 0 | 2 |
| empresa | 0 | 0 | 6 |
| trial | 11 | 0 | 0 |
| popup-plano | 9 | 0 | 1 |
| checkout | 5 | 0 | 1 |
| pagamento | 0 | 0 | 8 |
| whatsapp | 0 | 0 | 10 |
| email | 0 | 0 | 8 |
| push | 2 | 1 | 7 |
| comunicacao | 0 | 0 | 11 |
| schedulers | 0 | 0 | 10 |
| seguranca | 0 | 0 | 16 |
| mobile | 3 | 0 | 2 |
| eventos | 0 | 0 | 13 |

## Bloqueadores

- BUG-01: Popup Push reaparece em DEV com permission granted; confirmado pelo usuário
- AUTENTICACAO-01: evidência real desta release ausente
- EMPRESA-01: evidência real desta release ausente
- EMPRESA-03: evidência real desta release ausente
- EMPRESA-04: evidência real desta release ausente
- TRIAL-01: evidência real desta release ausente
- TRIAL-02: evidência real desta release ausente
- TRIAL-03: evidência real desta release ausente
- TRIAL-07: evidência real desta release ausente
- TRIAL-10: evidência real desta release ausente
- TRIAL-11: evidência real desta release ausente
- POPUP-PLANO-01: evidência real desta release ausente
- POPUP-PLANO-02: evidência real desta release ausente
- POPUP-PLANO-04: evidência real desta release ausente
- POPUP-PLANO-05: evidência real desta release ausente
- POPUP-PLANO-06: evidência real desta release ausente
- POPUP-PLANO-07: evidência real desta release ausente
- POPUP-PLANO-09: evidência real desta release ausente
- CHECKOUT-01: evidência real desta release ausente
- CHECKOUT-04: evidência real desta release ausente
- CHECKOUT-05: evidência real desta release ausente
- PAGAMENTO-01: evidência real desta release ausente
- PAGAMENTO-02: evidência real desta release ausente
- PAGAMENTO-03: evidência real desta release ausente
- PAGAMENTO-04: evidência real desta release ausente
- PAGAMENTO-05: evidência real desta release ausente
- PAGAMENTO-06: evidência real desta release ausente
- WHATSAPP-04: evidência real desta release ausente
- EMAIL-02: evidência real desta release ausente
- EMAIL-04: evidência real desta release ausente
- PUSH-02: evidência real desta release ausente
- PUSH-03: evidência real desta release ausente
- PUSH-04: evidência real desta release ausente
- PUSH-05: evidência real desta release ausente
- PUSH-06: evidência real desta release ausente
- PUSH-07: evidência real desta release ausente
- COMUNICACAO-01: evidência real desta release ausente
- COMUNICACAO-02: evidência real desta release ausente
- COMUNICACAO-03: evidência real desta release ausente
- COMUNICACAO-04: evidência real desta release ausente
- COMUNICACAO-05: evidência real desta release ausente
- COMUNICACAO-06: evidência real desta release ausente
- COMUNICACAO-07: evidência real desta release ausente
- SEGURANCA-01: evidência real desta release ausente
- SEGURANCA-02: evidência real desta release ausente
- SEGURANCA-03: evidência real desta release ausente
- SEGURANCA-04: evidência real desta release ausente
- SEGURANCA-05: evidência real desta release ausente
- SEGURANCA-06: evidência real desta release ausente
- SEGURANCA-07: evidência real desta release ausente
- SCHEDULERS-01: evidência real desta release ausente
- SCHEDULERS-02: evidência real desta release ausente
- SCHEDULERS-03: evidência real desta release ausente
- SCHEDULERS-05: evidência real desta release ausente
- SCHEDULERS-06: evidência real desta release ausente
- SCHEDULERS-07: evidência real desta release ausente
- MOBILE-02: evidência real desta release ausente
- MOBILE-05: evidência real desta release ausente

## Limites da conclusão

O BUG-01 Push continua aberto por confirmação do usuário DEV. Permission granted controlada passando não encerra a sessão afetada. Não houve compra sandbox real, entrega WhatsApp/e-mail/Push real, criação DEV nesta execução, restart DEV, teste PostgreSQL multirréplica ou implantação staging. Acesso anônimo negado não aprova ataques entre contas QA autenticadas. PGlite e gateway mock validam a camada local. Ver [limitações e escopo](LIMITACOES.md), [checklist](CHECKLIST.md), [proposta staging](STAGING.md) e [diagnóstico futuro](DIAGNOSTICO-PROPOSTA.md).

Sem commit, push, deploy, migration, alteração PROD/main ou mudança do relógio da VPS.

## Bloco 2 — Push e popup (correção local)

**POPUP PUSH DEV: FALHOU / incidente aberto. PUSH: PARCIAL.** Não houve deploy. A causa específica do perfil DEV do usuário ainda não está comprovada.

Antes de alterar produto, Chrome registrou `permission=granted`, um convite visível, storage vazio e SW raiz quando o evento de Notifications Permissions API não estava disponível. O código anterior lia permissão apenas durante render e ignorava falha de observação. A regressão local desse caminho foi corrigida; isso não reproduz automaticamente o perfil DEV afetado.

| Evidência nova | Resultado | Camada |
|---|---|---|
| Web unitários | 378 passaram | TESTE UNITÁRIO / integração DOM |
| Push backend existente | 70 passaram; API não alterada | TESTE UNITÁRIO, persistência/transport mocks |
| Playwright local completo | 108 passaram, 36 casos × 3 projetos | TESTE E2E LOCAL; permissão/SW nativos, subscription/API fixtures |
| Push DEV autenticado | 6 skipped | NÃO TESTADO; QA ausente |
| Lint / TypeScript / build webpack | PASSOU | CHECK local |
| git diff --check Web/API | PASSOU | CHECK local |

Regressão de login, trial, modal de plano, checkout, conta/notificações/PWA e três tamanhos de tela passou. Nenhuma validação de recebimento Push, Safari/iOS real ou dispositivo do usuário foi realizada. Matriz Push atualizada somente na camada local; BUG-01 permanece aberto e gate REPROVADO. As evidências de outros módulos acima são da execução anterior, não desta correção.

[Relatório completo do Bloco 2](/home/guest/Projetos/Kalend/correcao-bloco2-2026-10-09/RELATORIO.md) · [Playwright local](/home/guest/Projetos/Kalend/correcao-bloco2-2026-10-09/evidencias/playwright-local-final.json) · [Reprodução antes](/home/guest/Projetos/Kalend/correcao-bloco2-2026-10-09/evidencias/reproducao-antes.json) · [DEV skipped](/home/guest/Projetos/Kalend/correcao-bloco2-2026-10-09/evidencias/playwright-dev-real.log).

## Bloco 3 — Outbox, provider, retry e visibilidade (13/10/2026)

Este registro cobre somente o Bloco 3. Trial e popup Push não foram reabertos nem retestados aqui; a correção Push já foi confirmada pelo usuário em DEV. Nenhuma integração real, conta, provider ou dado DEV/produção foi alterado.

### Causa e mudança

Antes da correção, a expansão da Outbox ignorava o canal quando resolveProvider() retornava null e, ao final do evento, preenchia expandedAt sem criar entrega nem erro. O worker passava a ignorar permanentemente aquele evento, inclusive após a configuração GLOBAL ser corrigida. A regressão automatizada confirmou esse estado antes da mudança: expandedAt preenchido, lastError nulo, nenhuma delivery e nenhum retry possível.

Agora, provider ausente/desativado, escopo inválido, adapter indisponível ou incompatibilidade template/provider deixam a Outbox não expandida, registram um código seguro (NO_ACTIVE_PROVIDER, PROVIDER_DISABLED, PROVIDER_SCOPE_INVALID, PROVIDER_UNAVAILABLE ou TEMPLATE_PROVIDER_MISMATCH) e aparecem numa consulta dedicada de Falhas. A expansão reavalia o mesmo evento em execuções subsequentes. Ao retornar o provider, a restrição única existente na delivery evita criar novamente um destinatário/canal que já tenha sido expandido.

Falhas de envio temporárias, rate limit e desconhecidas usam a política existente: até cinco tentativas, nextAttemptAt com backoff 60/120/240/480 segundos. Falhas permanentes/configuração não entram em retry. Após restart, um SENDING órfão há mais de cinco minutos vira UNCERTAIN e não é reenviado automaticamente, evitando duplicação quando o ACK externo pode ter se perdido. O worker usa claim atômico por status/tentativas; o teste concorrente local verificou um envio no fixture.

ACCEPTED significa aceite/submissão pelo provider. DELIVERED/READ só podem representar callback efetivo quando o canal o fornece; a API e UI mantêm essa distinção. Provider ausente, retry pendente, falha ou processamento incerto não aparecem como sucesso. Logs guardam IDs de delivery/Outbox, ação, código e tentativa, sem exception bruta ou segredo.

### Evidências desta execução

| Verificação | Resultado | Camada |
|---|---|---|
| Reprodução do provider ausente antes da correção | BUG reproduzido: evento era consumido sem delivery e sem erro | Teste unitário de regressão |
| API focada de comunicação | 84 testes passaram antes do ajuste de tipos dos fixtures; após o ajuste, engine 33/33 passou | TESTE UNITÁRIO |
| API completa | 40 arquivos, 699 testes passaram | TESTE UNITÁRIO |
| API E2E | 7 arquivos, 128 testes passaram | TESTE E2E LOCAL; fixtures/serviços simulados |
| Restart em processo separado e PGlite em disco | 10 asserções passaram; Outbox/retry persistem e SENDING vira UNCERTAIN | TESTE INTEGRAÇÃO LOCAL |
| Web unitários | 17 arquivos passaram | TESTE UNITÁRIO |
| Playwright Outbox | 3/3 passaram (desktop, tablet, mobile) | TESTE E2E LOCAL; API fixture .invalid |
| Lint, TypeScript, build webpack, Prisma validate | passaram | Verificações locais |
| Providers externos e recibos reais | não executados; não houve envio | NÃO TESTADO / DEV REAL |

Há uma execução completa da API e E2E anterior à correção final de anotações de tipo nos fixtures; após esse ajuste, rodaram TypeScript, lint e 33 testes do engine. A implementação de runtime não mudou depois da execução completa.

### Limites e itens pendentes

- A Outbox bloqueada por configuração é reavaliada em cada execução do worker; o schema não tem contador/nextAttemptAt para falha de expansão. A frequência real é determinada pelo agendador externo e não foi confirmada em DEV. Não foi criada migration.
- A concorrência PostgreSQL multi-instância não foi testada; o unitário valida compare-and-swap e a consulta de expansão mantém FOR UPDATE SKIP LOCKED.
- O cenário de restart não testa o processo de envio real após provider aceitar e perder ACK. O resultado continua conservador (UNCERTAIN) e não promete exactly-once.
- SMTP, Evolution, Meta e Push não foram contatados. ACCEPTED validado aqui veio de provider mockado.
- Os itens OUTBOX-01 a OUTBOX-13 foram adicionados à matriz com o nível de evidência correspondente. Nenhuma linha DEV REAL foi marcada como aprovada.

Status deste bloco: **PARCIAL**. O bug de provider ausente e a semântica local da fila foram corrigidos e testados. A homologação DEV real de providers, frequência do worker e concorrência com PostgreSQL continua pendente.

## Barreira de comunicação QA (13/10/2026)

Implementada localmente uma trilha técnica isolada `QA_COMMUNICATION_TEST`. O endpoint `POST /communication/qa-test` fica sob o guard global de Super Admin e valida ambiente do backend, IDs QA configurados no servidor, company ativa com slug reservado, OWNER ativo da mesma company, canal/provider GLOBAL ativo e destinatário/device allowlisted. A mensagem usa conteúdo fixo e inofensivo. O destinatário não vem do corpo da requisição; e-mail/WhatsApp vêm do perfil QA e Push exige uma subscription específica com authorization ativa para a company.

`communication:worker:qa` chama `--qa-only`, rejeita ambiente não autorizado e consome no máximo uma delivery elegível do evento QA. Esse caminho não chama geração temporal, ingestão de notificações nem expansão comercial. O worker normal exclui o evento QA tanto da expansão quanto da seleção de deliveries. A validação de escopo/destinatário é repetida imediatamente antes de obter contexto do provider e enviar. A mesma chave idempotente reutiliza uma Outbox/delivery. O template QA é fixo e a rota genérica de edição de templates não pode alterá-lo. Não foi criada migration.

O ambiente só é reconhecido por URL backend e identidade do banco configuradas no processo; `NODE_ENV` e dados enviados pelo navegador não habilitam QA. DEV exige a origem `api-dev.kalend.tech` junto ao banco `kalend_dev`; produção é recusada mesmo com as flags QA presentes. Staging tem identidade reconhecida, mas o adaptador Evolution atual ainda reconhece somente DEV/PRODUCTION; envio WhatsApp em staging permanece bloqueado até haver suporte explícito de ambiente nessa integração.

| Verificação | Resultado | Camada |
|---|---|---|
| Policy QA, escopo, allowlist, bloqueio de produção, revalidação antes do provider e intent idempotente | 10 testes QA passaram dentro dos 43 testes focados de comunicação | TESTE UNITÁRIO / fixtures locais |
| API completa | 42 arquivos; 709 testes passaram | TESTE UNITÁRIO e integração local com simuladores |
| API E2E | 7 arquivos; 128 testes passaram | TESTE E2E LOCAL; não chama provider externo |
| API TypeScript, lint e build | passaram usando Node 24.21.0 | CHECK local |
| Prisma validate | passou com `DATABASE_URL` descartável apenas para carregar a configuração | CHECK local; nenhuma conexão/migration |
| Web unitários | 17 arquivos; todos passaram após manter o evento QA fora do catálogo comercial | TESTE UNITÁRIO |
| Web lint e build webpack | passaram; build fora do sandbox depois de erro de parsing de tsc no sandbox | CHECK local |
| DEV real / mensagem externa | não executados; nenhum tenant ou contato criado e nenhum envio feito | NÃO TESTADO |

Os cenários QA-COMM-01 a QA-COMM-07 estão marcados como evidência unitária local na matriz; QA-COMM-08 (Push device/authorization) permanece NÃO TESTADO. A matriz não representa prova DEV real. Para habilitar a primeira execução controlada, ainda será preciso criar a company `QA-COMMUNICATION-DEV`, OWNER e configurar IDs/destinatários QA exclusivamente no ambiente DEV; nenhum contato foi inventado nesta alteração. E-mail depende de provider QA; WhatsApp usa o provider GLOBAL já existente somente após allowlist de um número controlado; Push depende de um device QA e authorization própria.

**Status da preparação QA: PARCIAL.** A barreira de código local passou testes; não há autorização/configuração para envio real nem homologação de recipient/device. Timer e execução recorrente continuam desativados.
