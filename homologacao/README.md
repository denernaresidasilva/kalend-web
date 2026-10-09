# Homologação oficial Kalend

Suíte repetível anterior a release. Não publica, não reinicia DEV, não escreve no banco DEV e não altera produção. A execução padrão é local, em develop. Evidências de execuções anteriores não substituem uma execução da release candidata.

## Executar

Node >=22.23 (DEV usa Node24), npm ci nos dois repositórios e Chrome/Chromium instalado. Dependências QA são devDependencies. `QA_CHROME=/caminho/chrome` permite trocar o executável. O banco PGlite é descartável em memória; nunca recebe DATABASE_URL remoto.

```sh
node homologacao/scripts/run.mjs
# Acrescenta testes reais públicos, sem criar dados (credenciais ausentes => skips):
node homologacao/scripts/run.mjs --dev
# Apenas navegador local, depois do build fixture feito pelo runner:
cd kalend-web
npm run test:homologacao
# Somente alvos públicos reais e cenário Push autenticado se QA disponível:
QA_MODE=dev npm run test:homologacao
# Staging é proposta, não está implantado:
QA_MODE=staging npm run test:homologacao
```

O runner salva logs, SHA, versão Node, horário UTC, duração, exit code e JSON em `homologacao/evidencias/<run-id>/`. Cada execução devolve não zero enquanto os critérios críticos reais não estiverem comprovados. Falhas de execução não são escondidas por retries automáticos. Os cenários de browser são executados em desktop, tablet e mobile; isso emula dimensões/touch Chromium, não comprova Safari/iOS ou hardware real.

## Camadas de evidência

1. TESTE UNITÁRIO: Vitest API e Node test Web; mocks explicitados.
2. TESTE INTEGRAÇÃO: SQL/HTTP PGlite com migrations versionadas, providers/gateway mock. Não representa PostgreSQL multiconexão nem entrega externa.
3. TESTE E2E LOCAL: Playwright/Chrome + build local, APIs simuladas. Nenhuma interceptação é permitida em `.real.spec.ts`.
4. TESTE DEV REAL: hosts DEV reais, sem substituir endpoints. Público/health não aprova login autenticado, compra ou entrega.
5. TESTE STAGING REAL: mesmos contratos, infraestrutura isolada; atualmente NÃO TESTADO.
6. NÃO TESTADO: pré-condição ausente, skip, teste não implementado ou evidência ausente. Não é PASSOU.

A matriz possui um roteiro por cenário, inclusive lacunas ainda manuais. O runner não transforma automaticamente um módulo inteiro em PASSOU a partir do exit code de uma suíte. `RESULTADOS.md` traz execução corrente e suas limitações. Não afirmar que todos os cenários da matriz estão automatizados.

## Dados e cleanup

Empresa `QA-E2E-<timestamp>-<random>`, e-mail `qa+<timestamp>-<random>@<domínio controlado>`. `example.invalid` é reservado para fixtures locais e nunca destino remoto. IDs devem ser gravados no ledger privado do run antes de prosseguir. Conta Super Admin QA dedicada deve ser provisionada por operador; senha via ambiente/secret manager, nunca arquivo versionado.

Não há endpoint de exclusão de company no contrato atual. Cleanup remoto automático está **desabilitado**: a suíte não inventa DELETE nem executa SQL remoto. Retenção/desativação de QA requer revisão do ledger e caminho administrativo existente. Toda remoção futura exige ID exato + prefixo QA + runId + ownership conferidos, em transação; nunca TRUNCATE, DELETE amplo ou filtro só por prefixo. PGlite e contextos de browser são descartados integralmente porque só existem para aquele processo.

Criar empresa DEV pode preparar uma sessão COMPANY Evolution automaticamente (`CompaniesService.prepareAfterCompanyCreated`). Até haver instância QA/configuração isolada, esse cenário permanece roteiro, sem operação remota automática. Não reutilizar `kalend_dev_global` para logout/reconnect/delete.

## Segurança das evidências

Traces locais têm apenas fixtures. Traces/screenshot de sessão remota desabilitados por padrão para evitar cookies, tokens, dados pessoais e QR. Logs nunca imprimem senha, cookies, subscription endpoint, SMTP credentials ou webhook secret. Não versionar `.auth`, ledger privado e artefatos. Recebimento externo deve ser evidenciado por ID de mensagem/correlation e destino QA redigido.

## Gate de produção

Nenhum bug crítico ou falha crítica de segurança; trial completo, modal, pagamento sandbox, SMTP real, WhatsApp real, Push real, Outbox e isolamento tenant comprovados na release e ambiente de homologação. Ausência de evidência crítica resulta **REPROVADO**, mesmo com todos os testes locais verdes. **APROVADO COM RESSALVAS** só admite lacunas não críticas explicitadas. BUG-01 permanece bloqueador até reproduzir/encerrar o incidente DEV com evidência do perfil afetado. Uma execução sintética granted passando não encerra esse incidente.

Fontes: auditoria-2026-10-09 e correcao-bloco1-2026-10-09. Referência Playwright: [projects](https://playwright.dev/docs/test-projects), [authentication](https://playwright.dev/docs/auth). Relatórios históricos de Bloco1 antecedem o deploy; não alterar a história dos relatórios.

## Consolidar evidências reais e liberar gate

`cenarios.json` é a matriz estruturada inicial; `MATRIZ-E2E.csv` é sua versão para leitura. Não editar apenas o CSV esperando que o runner aprove. Para uma execução homologada, importar `--real-evidence /caminho/manifesto-revisado.json`, lista de registros com ID, STATUS=PASSOU, TIPO DE TESTE=TESTE DEV REAL ou TESTE STAGING REAL, AMBIENTE, RESULTADO REAL, EVIDÊNCIA (arquivo existente), apiSha e webSha. O manifesto deve ter aprovação humana e referenciar evidência de cada caso; não gerar aprovação por exit code global. O gate recusa SHA diferente, evidência inexistente e mock. Incidentes críticos em incidentes.json só podem ser encerrados com comprovação revisada, nunca automaticamente por teste sintético.

### Variáveis QA remotas

QA_OWNER_EMAIL/PASSWORD/COMPANY_ID: conta QA existente. QA_OTHER_COMPANY_ID: tenant B não autorizado ao OWNER A. QA_EXPIRED_OWNER_EMAIL/PASSWORD/COMPANY_ID: fixture QA já expirada. QA_ADMIN_EMAIL/PASSWORD: Super Admin QA. QA_EMAIL_DOMAIN: domínio controlado. QA_TRIAL_PLAN_ID: plano trial habilitado.

Criação remota exige QA_ALLOW_CREATE=true e COMPANY Evolution QA isolada previamente, e roda só desktop. Checkout remoto exige QA_ALLOW_CHECKOUT=true e gateway SANDBOX, roda só desktop e não efetua pagamento. Essas flags ficam desligadas nesta execução. Casos sem pré-condição aparecem como skipped/NÃO TESTADO e bloqueiam o gate. Ledgers privados ficam ignorados em kalend-web/homologacao/artifacts; nunca removidos amplamente.

## Cleanup revisável

`node homologacao/scripts/cleanup-plan.mjs /caminho/ledger.json /caminho/plano.json` valida nome/e-mail QA da mesma execução e todos os IDs UUID, e produz somente um plano seco. Nenhum registro é apagado. Conta compartilhada e dependências precisam revisão; ambiente PROD e ledger de outro run são recusados. Há testes negativos para essas restrições.

## Versionamento

Conteúdo canônico em `kalend-web/homologacao`, para versionar junto do runner E2E. O atalho `homologacao` na raiz compartilhada mantém os comandos/documentação entre os dois projetos. Caso só o repositório Web seja clonado, mantenha `kalend-api` como diretório irmão e execute `node kalend-web/homologacao/scripts/run.mjs` a partir da pasta comum. Nenhum commit foi feito nesta entrega.

## Bloco 2 — Push

`push-flow.local.spec.ts` e `push-diagnosis.local.spec.ts` cobrem default/granted/denied, subscription ausente/válida, backend ausente/stale, reconexão explícita, multi-device, aba/rota/reload/logout/login e indisponibilidade do observer. Permissões e service worker são nativos Chrome; subscription e registro backend são fixtures. A regressão do observer ausente foi reproduzida antes da correção.

Para DEV autenticado, `QA_MODE=dev npx playwright test --config playwright.homologacao.config.ts homologacao/specs/authenticated.real.spec.ts`. Credenciais QA e company ID precisam estar no ambiente; sem eles, skipped/NÃO TESTADO. O caso de transição controla somente a disponibilidade do observer de permissão; API/autenticação/assets DEV não são interceptados. Não cria subscriptions nem envia notificações reais. Este teste usa contexto novo, não equivale ao perfil/PWA afetado relatado pelo usuário. O incidente BUG-01 não é encerrado automaticamente.

O popup somente convida quando a permissão é default. Permissão granted não prova subscription nem registro backend; reconexão fica em Configurações > Push e exige ação explícita. Não há flag de localStorage/sessionStorage para liberar convite em granted. O watcher compartilhado usa evento nativo, focus/visibility e fallback local de 250ms enquanto visível, sem requisições de consentimento/backend nesse polling.
