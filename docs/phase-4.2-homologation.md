# Fase 4.2 — fechamento com contrato comercial oficial

Este relatório substitui o diagnóstico anterior sobre falta de contrato temporal e de cobertura de papéis. Nenhum backend, Prisma, banco, gateway, PagBank, Push ou PWA foi alterado nesta etapa. Não foram criadas rotas de dashboard, nem executados commit, push ou deploy. O workspace já continha alterações da fase anterior; elas foram preservadas.

## A — Implementado

- `lib/contracts.ts` tipa `serverNow`, `trial.active/endsAt/remainingDays/expired`, `financial.requiresAction/status` e `context`. Não há cálculo de dias no navegador, comparação com relógio local ou inferência financeira por status.
- `lib/commercial-state.ts` centraliza GET `/billing/regularization`, compartilha chamadas simultâneas, reutiliza o resultado entre login, proteção e painel e guarda erros técnicos até uma tentativa explícita ou invalidação. A chave inclui usuário e `selectedCompanyId`. O `tenantApi` existente confirma a sessão sob lock e não envia empresa na query/body deste GET.
- `commercialDestination` decide: `financial.requiresAction === true` → `/conta/regularizar`; depois `trial.expired === true` → `/planos`; caso contrário → rota normal. `PAST_DUE` com `requiresAction=false` não bloqueia.
- `CommercialEntry`, montado no layout raiz, protege `/conta`, suas subrotas e `/planos`. Aguarda autenticação/consulta antes de exibir conteúdo protegido. Não repete redirect quando o destino já é a rota atual. `/conta/planos` permanece disponível como passagem para o checkout existente quando só o trial está expirado. A prioridade financeira também se aplica a `/planos` e `/conta/planos`.
- O painel utiliza a mesma consulta. Atualização manual, retorno de foco e conclusão/erro da operação existente de checkout reconsultam o contrato. A proteção observa os novos resultados; regularização concluída leva à conta ou aos planos conforme a decisão atual.
- Popup não modal, sem overlay ou bloqueio do dashboard, com textos literais de 3/2/1, “Escolher plano” → `/planos` e “Continuar usando” → fechar. Preferência por usuário/empresa/fim do trial/faixa em `sessionStorage`, com fallback em memória. Nenhuma preferência vai ao backend.
- Popup com `role=dialog`, `aria-modal=false`, descrição e nome acessíveis, foco inicial, controles nativos de teclado, Escape, botão de fechar e restauração de foco. Layout limitado à viewport e altura com rolagem interna.
- Regras de empresas preservadas: zero sem seletor, uma seleção automática, duas ou mais seletor. Troca invalida o estado e rejeita respostas antigas, sem reaproveitar decisões da empresa anterior.
- OWNER, ADMIN, PROFESSIONAL, RECEPTIONIST e CLIENT consultam o estado. As permissões para operar cobrança permanecem OWNER/ADMIN. SUPER_ADMIN ignora o estado comercial de empresa e mantém `/super-admin`.

### Rotas reais e fallbacks

| Papel | Destino normal | Situação |
|---|---|---|
| OWNER | `/conta` | Fallback temporário: dashboard dedicado inexistente |
| ADMIN | `/conta` | Fallback temporário: dashboard dedicado inexistente |
| PROFESSIONAL | `/conta` | Fallback temporário: dashboard dedicado inexistente |
| RECEPTIONIST | `/conta` | Fallback temporário: dashboard dedicado inexistente |
| CLIENT | `/conta` | Fallback temporário: dashboard dedicado inexistente |
| SUPER_ADMIN | `/super-admin` | Dashboard real existente |

`/planos`, `/conta/planos` e `/conta/regularizar` já existiam no workspace. O catálogo público e o catálogo comercial continuam vindo da API, incluindo preços, recursos, destaque, badge e opções mensal/anual. Os argumentos, endpoints, gateways e mecanismo de idempotência do checkout foram preservados.

### Formato real conferido por leitura

Foram lidos `../kalend-api/src/billing/regularization.service.ts`, `regularization.types.ts` e o controller, sem edição. A implementação efetiva mantém `companyId` na raiz; `context` tem `systemRole`, `role` e `commercialApplicable`. `financial.status` pode ser `null`; há também `paymentStatus`. O frontend aceita esse formato e a fixture mínima do pedido com `context.companyId`. Se ambas as identidades estiverem presentes, ambas devem coincidir com a seleção. Campos antigos de decisão (`accessAllowed`, `reason`, `trialExpired`, status da raiz) não são usados para navegação. Os dados existentes de planos, subscription, gateways e pendingCheckout continuam disponíveis ao checkout.

## B — Corrigido

- Decisão antiga por `accessAllowed`, `reason`, `PAST_DUE` e `trialExpired` substituída pelos campos oficiais.
- Expiração agora direciona a `/planos`, preservando a passagem autorizada ao checkout.
- Consulta antes limitada a gestores agora cobre os cinco papéis reais.
- Consultas redundantes de entrada/painel substituídas por consulta compartilhada.
- Erro técnico apresenta aviso e nova tentativa e mantém o conteúdo normal acessível; não cria bloqueio financeiro.
- Respostas comerciais antigas são rejeitadas após mudança de contexto.
- Testes e fixtures anteriores atualizados para as regras novas; a auditoria de armazenamento permite exclusivamente a preferência visual do aviso, sem armazenamento de credenciais.

## C — Testado

- `npm test`, com Node 24.14.0: seis arquivos de testes passaram, sem falhas. Incluem prioridades, 3/2/1 e >3, carência PAST_DUE, cinco papéis e SUPER_ADMIN, regras de zero/uma/múltiplas empresas, troca e rejeição de resposta antiga, erro técnico, deduplicação, reconsulta, formato real e prevenção de loops. Teste de checkout existente continua passando.
- `npm run lint`: passou.
- `npm run build`: executado. Node padrão do shell (18) é incompatível com Next 16; execução refeita com Node 24 disponível em `/tmp`. Turbopack reproduziu EPERM ao abrir porta para PostCSS, inclusive na tentativa escalada. Log: `/tmp/next-panic-9129593d90fa6b09ffdb0a9b4c64aca1.log`.
- Alternativa oficialmente suportada `npm run build -- --webpack`: compilação, TypeScript e geração de 21 páginas passaram, sem alteração de configuração.
- Navegador Chrome headless: `tests/commercial-contract.browser.cjs`, com contrato real simulado e API reservada, valida redirects, papéis, deduplicação, carência, atualização após regularização, erro/retry, empresas, CTAs, teclado, foco, Escape e preferência de sessão. Popup medido em 320, 375, 390, 430, 768, 1024, 1280, 1440 e 1920; sem overflow.
- Resultados de navegador: `/tmp/phase42-commercial-browser.json`. Build temporário usa `https://api.kalend.invalid` apenas para interceptação das fixtures; ao terminar é gerado novamente sem esse valor temporário.
- `git status --short`, `git diff --stat`, `git diff --check` executados no encerramento. Não foram executados `git add`, commit, push ou deploy.

## D — Pendente

Homologação autenticada no ambiente real com usuários/empresas em cada condição comercial e pagamento confirmado pelo backend. Os testes locais usam fixtures; não houve pagamento externo nem validação de credenciais/gateway. Os cinco dashboards dedicados seguem inexistentes e usam os fallbacks documentados, conforme o escopo solicitado.

## E — Bloqueado

Build padrão Turbopack pelo EPERM do ambiente; alternativa Webpack disponível e validada. Sem sessão de teste fornecida, não é possível afirmar integração autenticada com a API publicada. Não há bloqueio de implementação do contrato no frontend.

## Arquivos desta etapa

- `app/layout.tsx`, `app/conta/page.tsx`, `app/styles/kalend-plans.css`
- `components/commercial-entry.tsx`, `components/trial-notice.tsx`, `components/regularization-panel.tsx`
- `lib/contracts.ts`, `lib/commercial-navigation.ts`, `lib/commercial-state.ts`
- `tests/commercial-contract.test.cjs`, `tests/commercial-contract.browser.cjs`, `tests/design-system.test.cjs`, `tests/design-system.browser.cjs`, `tests/integration.test.cjs`
- `docs/phase-4.2.md`, `docs/phase-4.2-homologation.md`

## Resultado

PRONTO PARA HOMOLOGAÇÃO FINAL DA FASE 4.2

A implementação e os testes locais estão concluídos. A homologação real autenticada permanece como próxima etapa. Build final Webpack sem URL temporária passou. `git diff --check` e verificação de whitespace dos arquivos não rastreados passaram. A saída integral de status, estatística e checagem está em `/tmp/phase42-git-review.txt`; ela inclui as alterações preexistentes e `git diff --stat` não conta arquivos não rastreados. Nada foi staged.
