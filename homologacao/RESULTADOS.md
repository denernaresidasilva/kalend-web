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
