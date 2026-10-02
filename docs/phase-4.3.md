# Fase 4.3 — auditoria e Bloco 1

Escopo executado neste turno: auditoria antes de alterações e implementação local do Bloco 1, conforme o último comando do pedido. Branch develop, inicialmente limpa. Sem staging, commit, push ou deploy. A fase inteira permanece em andamento e não está homologada no DEV.

## Auditoria

- Next 16.3.6, React 19.2.8, TypeScript 5, Tailwind 4, lucide-react e CSS compartilhado. App Router; não há BFF, rotas de API locais ou backend neste repositório. Guias instalados de layouts, CSS e componentes server/client consultados antes da implementação.
- Documentação lida: PWA-PUSH-FRONTEND (Fase 4.1-B), phase-4.2, phase-4.2-homologation, FRONTEND-AUTH-INTEGRATION, COMMERCIAL-FRONTEND e COMMUNICATION-FRONTEND.
- Rotas: / (login), /planos, /conta, /conta/planos, /conta/regularizar; /super-admin, empresas e empresas/nova, usuarios, planos e planos/novo e planos/[id], assinaturas e assinaturas/[id], financeiro, webhooks e webhooks/[id], comunicacao, configuracoes, configuracoes/pagamentos e configuracoes/pagamentos/[gateway].
- Shell compartilhado: AdminShell, Sidebar, Header, navigation; UI com Card, MetricCard, Button, IconButton, Drawer, Tooltip, Alert, Skeleton, Breadcrumb, EmptyState e PageHeader. Componentes de domínio mantêm handlers e contratos próprios.
- API central: NEXT_PUBLIC_API_URL obrigatória, sem fallback de produção; credentials include, no-store, mensagens sanitizadas e refresh único coordenado com Web Locks/BroadcastChannel. Catálogo público usa credentials omit.
- Autenticação: login/me/refresh/logout/logout-all/tenant; AuthProvider revalida ao retornar foco e sincroniza encerramento entre abas. Nenhum token/credencial armazenado pelo redesign.
- Empresas: selectedCompanyId confirmado pelo backend, zero/uma/múltiplas empresas, seleção sob lock, invalidação/rejeição de estado comercial antigo. Planos, trial, regularização e PagBank preservados.
- Contratos principais: lib/contracts.ts (AuthMe, Summary, Gateway, PublicPlan, Regularization, SubscriptionDetail); lib/communication.ts; lib/push/client.ts. API de empresas/manual, usuários/summary, planos CRUD, assinaturas/detalhe, financeiro/summary, payment-gateways/config/test, webhooks/summary/detalhe/reprocess e billing/regularization/checkout/cancel/reconcile já consumidas pelo frontend.
- Tema anterior: light/dark/system em kalend:theme, script antes da pintura, roxo, preferência inicial system. Novo padrão: dark. Preferências explícitas já salvas são preservadas, incluindo system legado; controle visual alterna apenas light/dark.
- Push nativo: /communication/push/public-config e subscriptions GET/POST/PUT/DELETE; VAPID, SW, permissão por gesto, dispositivos e vínculo de usuário/empresa. PWA preserva paths, scope, start_url, segurança e ciclo de atualização. Identificação ANDROID/IOS em dispositivo Web não equivale a aplicativo nativo.
- Comunicação global: providers GET/PATCH/test/send-test, Evolution pair, events, templates GET/PATCH, Meta list/sync/create, outbox/deliveries/failures/logs, delivery reprocess. OAuth Gmail existe no backend local: communication/gmail/status, connect e disconnect; callback controlado pelo backend. Não confundir ausência de UI com ausência de contrato.
- Templates atuais: EMAIL subject/text, WHATSAPP Evolution text ou referência Meta, PUSH title/text. Eventos/variáveis vêm da API. Aprovação Meta é externa. Backend gera HTML escapado do texto; entrada de HTML administrativo não é suportada.
- Perfil atual: nome/e-mail somente leitura, empresas, Push, assinatura e logout. AuthMe não oferece foto/telefone. Não há endpoints de atualização de perfil/foto/senha no controller de autenticação inspecionado.
- Dashboard: /dashboard/summary fornece contagens, receita líquida acumulada/mensal UTC, empresas novas no mês e eventos recentes. /webhooks/summary e /payment-gateways mantêm painel operacional. Serviço local confirmado por leitura: estados de empresa e isActive têm semânticas distintas; inactive pode sobrepor suspended/canceled. Não usar inactive como segmento exclusivo.
- Configurações centraliza destinos existentes, mas canais técnicos ainda estão dentro da comunicação. Segurança e edição de empresa estavam em preparação.

## Dependências para os próximos blocos

Estas são necessidades de contrato, não endpoints existentes nem autorização para escrever no backend externo ao workspace:

1. Perfil: leitura/atualização de campos permitidos, upload/remoção de avatar e alteração de senha pelo mecanismo existente com verificação de senha atual e política de revogação de sessões.
2. Notificações pessoais: persistência com usuário/empresa/audiência, mensagem, tipo, createdAt, readAt, ação segura e expiresAt decidido pelo servidor; listagem e contagem não lida, marcar leitura e preferência. Retenção de sete dias precisa de limpeza real idempotente no banco/worker e testes temporais. Não reutilizar outbox como inbox nem esconder itens pelo relógio do cliente.
3. Push App: decisão técnica do provedor, contrato de configuração/capabilities, registro e revogação de tokens mobile, segregação de ambiente/audiência e envio compatível. Não escolher FCM/OneSignal arbitrariamente.
4. Gmail: integrar OAuth confirmado, status/conta, teste via provider e desconexão; confirmar implantação DEV. Não solicitar senha Gmail nem inventar credenciais.
5. Templates: HTML editável exige contrato e política de sanitização; destino de Push e opção de compartilhamento com App precisam de persistência suportada. Manter subject/text e referências Meta compatíveis.
6. Histórico de receita/empresas, MRR e crescimento percentual precisam de contrato agregado com intervalo e semântica financeira. Não deduzir de totais atuais.

## Plano da fase única

1. Design System/tema/logo/shell/dashboard — implementado localmente neste turno.
2. Perfil/Minha Conta — parcialmente implementado no Bloco 2; edição de dados/foto/senha aguarda backend.
3. Sino/central/retencão real de sete dias — pendente de backend.
4. Limpeza do financeiro e visão geral da comunicação — pendente.
5. Push Web/App e Gmail — pendente.
6. Templates completos em português — pendente.
7. Configurações pela engrenagem — pendente.
8. Testes e homologação completa — em andamento; DEV depende de autorização e ambiente autenticado.

## Bloco 1

Identidade preto/grafite/dourado em tokens globais, login, LP, shell e pontes de estilos comerciais. Tema escuro inicial com persistência, ícones sol/lua e suporte ao system legado. Logo vetorial determinístico com agenda e palavra KALEND; componente central é ponto de substituição pelo asset oficial. Ícones PNG e favicon exportados da mesma geometria, mantendo paths usados pela PWA/Push.

Header de uma linha, avatar com iniciais reais e link /conta, configurações, logout e ação + contextual com nome acessível/tooltip. Sidebar/drawer/rotas preservados. Sino será conectado no Bloco 3 ao contrato persistente, sem contagem fictícia.

Dashboard inicia com oito métricas principais, seguido de três gráficos de barras de distribuição por estado. Contagens acessíveis em dl/dt/dd; barras decorativas ocultas do leitor de tela. Inactive, usuários e totais ficam em Mais indicadores; webhooks e painel operacional continuam disponíveis. Nenhuma série histórica/MRR/receita de trial criada. Atualização de métricas ocorre ao montar/retornar foco; retry aparece em falha.

Arquivos novos: components/kalend-logo.tsx, components/dashboard-charts.tsx, public/icons/kalend-mark.svg, docs/phase-4.3.md. Alterações: tema e tokens, estilos components/plans/shell, root layout/manifest/favicon/login, Super Admin dashboard/empresas, sidebar/header/navigation, dashboard-summary, LP, ícones PWA e testes design-system.

## Validação

Resultados finais acrescentados após os comandos e revisão no navegador. Testes locais com fixtures não comprovam autenticação, cobrança, instalação ou entrega Push no DEV.

### Resultados locais

- Node 24.14.0 disponível em /tmp; nenhuma dependência ou script alterado.
- npm test: seis arquivos de suíte aprovados; o design system contém 17 testes, incluindo contraste WCAG de texto/controles, dark padrão, persistência e preferências legadas, toggle por ícone, navegação, avatar/ação/logout, valores de gráficos incluindo zero e interação/foco do drawer. Demais suítes de autenticação/empresas/comercial/Push/comunicação permanecem aprovadas.
- npm run lint: aprovado, sem erros/avisos.
- git diff --check: aprovado.
- npm run build: Turbopack aprovado fora do sandbox, incluindo TypeScript e 21 páginas estáticas. A primeira tentativa dentro do sandbox ficou sem progresso e foi interrompida; a execução externa identificou favicon RGB em ICO, corrigido para RGBA. A execução final passou; não foi necessário fallback Webpack.
- Chrome headless com fixtures isoladas: 324 verificações em 18 rotas (login, LP e todas as páginas administrativas testadas) e 54 em conta/planos/regularização; ambos os temas e larguras 360, 375, 390, 414, 768, 1024, 1280, 1440 e 1920. Sem overflow horizontal da página, sem exceções JavaScript; header administrativo medido em uma linha. Tabelas mantêm rolagem local.
- Interações: drawer modal, Escape, bloqueio de scroll e retorno de foco; dark inicial mesmo com sistema claro; sol/lua, persistência/reload; destinos de avatar e +; seleção de plano/intervalo anual, prioridade financeira e redirecionamento de trial com fixtures.
- Revisão visual das capturas de dashboard 390/1440 e login desktop. Métricas mobile ajustadas para duas colunas; rótulo da navegação alterado para Visão geral. Verificações administrativas repetidas após os ajustes.
- Artefatos locais: /tmp/kalend-phase43-responsive.json, /tmp/kalend-phase43-owner-responsive.json e capturas /tmp/kalend-phase43-dashboard-390.png, /tmp/kalend-phase43-dashboard-1440.png, /tmp/kalend-phase43-login.png. Fixtures não fazem parte dos dados da aplicação. Build final restaurado sem NEXT_PUBLIC_API_URL=https://api.kalend.invalid.
- Acessibilidade validada para os controles alterados e contraste semântico; não equivale a certificação integral de todas as telas/variantes de dados ou teste com leitor de tela.
- DEV autenticado, cookies/CORS reais, instalação e entrega Push reais permanecem pendentes. Nenhuma afirmação de ausência absoluta de regressões em ambiente real. A fase completa não está pronta para homologação final/commit.

### Arquivos na revisão

- `app/favicon.ico`
- `app/layout.tsx`
- `app/manifest.ts`
- `app/page.tsx`
- `app/styles/kalend-components.css`
- `app/styles/kalend-plans.css`
- `app/styles/kalend-tokens.css`
- `app/styles/super-admin-shell.css`
- `app/super-admin/empresas/page.tsx`
- `app/super-admin/page.tsx`
- `components/dashboard-summary.tsx`
- `components/plans/public-plans.tsx`
- `components/super-admin/header.tsx`
- `components/super-admin/navigation.ts`
- `components/super-admin/sidebar.tsx`
- `components/theme/theme-control.tsx`
- `components/theme/theme-provider.tsx`
- `lib/theme.ts`
- `public/icons/kalend-180.png`
- `public/icons/kalend-192.png`
- `public/icons/kalend-512.png`
- `tests/design-system.browser.cjs`
- `tests/design-system.test.cjs`
- `components/dashboard-charts.tsx`
- `components/kalend-logo.tsx`
- `docs/phase-4.3.md`
- `public/icons/kalend-mark.svg`

## BLOCO 2 — PERFIL / MINHA CONTA

Escopo exclusivo de /conta e reutilização do shell existente. Os Blocos 3–8 não foram iniciados. O Bloco 1 estava presente em alterações locais; um inventário SHA-256 antes deste bloco permite distinguir as mudanças novas das anteriores (/tmp/kalend-block2-baseline.json).

### Auditoria antes de código

- /conta era uma página simples com AuthProvider, dados somente leitura, seleção de empresa, PushSettings e RegularizationPanel. Também selecionava automaticamente a única empresa ao montar. Essa seleção automática foi removida exclusivamente de /conta, conforme a instrução deste bloco; o comportamento do login foi preservado.
- AuthProvider mantém a única fonte de identidade, por GET /auth/me, com atualização ao retornar foco, eventos de sessão e empresa. Versões rejeitam resultados anteriores; nenhum perfil adicional foi armazenado. Transporte mantém cookies, no-store, refresh coordenado e sanitização de erros.
- Backend local inspecionado somente por leitura: auth.controller.ts, auth.service.ts, auth.types.ts, users.controller.ts e schema.prisma. /auth/me identifica user.id pelo cookie autenticado, retorna name/email/isSuperAdmin, systemRole, memberships, selectedCompanyId e session.expiresAt/refreshExpiresAt.
- User.phone existe no banco, mas não entra em identitySelect nem no retorno de /auth/me. GET /users/:id é administrativo e não representa um contrato de perfil próprio disponível aos seis papéis; não foi usado como substituto de API de conta.
- Não há campo de avatar no modelo User ou em /auth/me; não há endpoint de upload/remoção de foto, atualização de dados pessoais ou alteração de senha nos controllers atuais.
- Existe POST /auth/logout-all, protegido por AuthGuard: usa request.auth.user.id, revoga todas as AuthSessions do próprio usuário e limpa os cookies. Existe POST /auth/logout para a sessão atual. O transporte já reconhece essas mutações e não tenta refresh recursivo.
- A política de senha do login limita o tamanho em bytes, mas não define uma política oficial de nova senha. A regra do bootstrap administrativo não deve ser presumida como contrato de alteração de senha do usuário.
- SUPER_ADMIN é conta global, sem tenant obrigatório. Os cinco papéis de empresa têm a mesma estrutura de AuthMe; a função exibida vem do vínculo que corresponde exatamente a selectedCompanyId. O papel global não é substituído por uma função de empresa.
- Shell, Header, Sidebar, Drawer, botões, cards, Alert, Loading, ThemeControl, CompanySelector, PushSettings e RegularizationPanel puderam ser reutilizados.

### Implementado com contratos reais

- /conta usa AdminShell, Header e Sidebar existentes com configuração opcional de navegação. Os defaults do Super Admin foram preservados. Não há segundo header ou infraestrutura paralela de navegação.
- Perfil, Segurança e Preferências têm destinos /conta#perfil, #seguranca e #preferencias, histórico nativo, estado ativo dourado e conteúdo acessível. SUPER_ADMIN possui também o destino real /super-admin; demais papéis não recebem links de administração global.
- Perfil mostra nome/e-mail em leitura, tipo de conta, função e empresa efetivamente selecionada; avatar com iniciais (incluindo fallback de nome vazio e caracteres Unicode). Header usa o mesmo componente de avatar. Foto e telefone não são simulados.
- CompanySelector existente é reutilizado em uma seção separada de contexto. Só vínculos retornados pela sessão podem ser escolhidos. Um parâmetro opcional allowSingle permite a ação explícita quando existe uma única empresa ainda não selecionada. Default do seletor e fluxo de login foram preservados. Abrir o perfil não faz POST /auth/tenant.
- Assinatura/planos/RegularizationPanel continuam disponíveis a OWNER/ADMIN no perfil e empresa selecionada; os outros papéis mantêm a orientação ao responsável. Regras comerciais de trial/regularização não foram modificadas.
- Segurança mostra validade da sessão e limite de renovação reais. Logout atual usa AuthProvider. Logout de todos os dispositivos usa POST /auth/logout-all sem userId, companyId, role ou outros dados no body, confirmação, cancelamento/Escape, erro inline e bloqueio síncrono de duplicação. Estado local/sincronização de abas só são encerrados após sucesso do servidor.
- Preferências reutiliza ThemeControl e PushSettings existentes com chave de usuário/empresa. Não houve implementação de central/sino/retenção, Push App, Gmail ou comunicação nova.
- Conteúdo autenticado remonta por user.id para não transportar estado de uma identidade anterior. Operações ignoram resultados após desmontagem. Nenhuma senha/token/foto/perfil foi persistido pelo bloco.

### Pendente / contratos backend necessários

O Bloco 2 está PARCIALMENTE IMPLEMENTADO. Edição do perfil, foto e senha estão bloqueadas por contrato; interfaces de envio fictícias não foram criadas. A homologação autenticada DEV continua pendente.

Propostas abaixo são contratos necessários para revisão no backend, NÃO endpoints existentes e NÃO são chamados pelo frontend:

1. **Leitura própria:** ampliar GET /auth/me para retornar phone (string ou null) e metadados de avatar (URL segura/versionada ou null) do usuário autenticado para todos os papéis. Preservar todos os campos, cookies e contexto atuais; não ampliar o acesso administrativo /users.
2. **Atualização própria:** definir endpoint autenticado, por exemplo PATCH /auth/profile, aceitando exclusivamente name e phone conforme regras de formato/tamanho definidas pelo servidor. Identidade derivada da sessão; rejeitar userId, companyId, email, role, isSuperAdmin e permissões no payload. Retornar dados canônicos; frontend reconsulta AuthProvider após sucesso. Não é necessário novo banco para name/phone já existentes.
3. **Avatar:** definir upload próprio, por exemplo POST /auth/avatar (multipart), e remoção DELETE /auth/avatar. Persistência real de arquivo/metadata, autenticação, limites de bytes e dimensões definidos pelo backend, formatos JPEG/PNG/WebP, validação pelo conteúdo e decodificação/reexportação segura; rejeitar SVG/HTML e conteúdo executável. Retornar o avatar canônico e disponibilizá-lo no perfil próprio. Precisam ser definidos armazenamento, limpeza da imagem anterior e cache/versionamento antes de implementar preview/upload/sucesso/erro/cancelamento. Sem localStorage ou URL fictícia.
4. **Senha:** definir endpoint próprio, por exemplo POST /auth/change-password, aceitando currentPassword/newPassword, derivando identidade da sessão e verificando o hash atual. Definir política oficial (mínimo/máximo/bytes), rate limit, proteção de origem, exclusão de senha de logs, retorno de erros sanitizados e política explícita de revogação de sessões/cookies e reautenticação. Frontend valida confirmação e política oficial, limpa os campos após tentativa e obedece a decisão do servidor. Não reutilizar segredo de bootstrap ou armazenamento de senha no cliente.
5. **E-mail:** segue somente leitura. Alteração depende de um fluxo oficial com verificação da nova conta e não faz parte de um PATCH genérico de perfil.

Testes de upload real, atualização bem-sucedida/falha e alteração/validação/confirmação de senha NÃO podem ser considerados executados sem esses contratos. Os testes atuais verificam que campos/operações não suportados não são apresentados como funcionais e que não há envio de senha/arquivo.

### Arquivos deste bloco

Alterados: app/conta/page.tsx; components/super-admin/admin-shell.tsx, header.tsx, sidebar.tsx (somente pontos opcionais de reutilização e avatar compartilhado); components/company-selector.tsx; app/styles/kalend-components.css (estilos de conta adicionados ao final); tests/company-selection.test.cjs; docs/phase-4.3.md.

Criados: components/account-content.tsx; components/account-profile.tsx; components/account-security.tsx; components/user-avatar.tsx; lib/account.ts; lib/account-session.ts; lib/user-avatar.ts; tests/account.test.cjs; tests/account.browser.cjs.

Endpoints usados neste bloco: GET /auth/me pelo AuthProvider, POST /auth/logout pelo mecanismo existente, POST /auth/logout-all. Seleção explícita preserva GET /auth/me + POST /auth/tenant. Preferências/assinatura continuam usando os contratos existentes de Push e billing, sem mudanças.

### Testes e resultados

Resultados finais de build/navegador/auditoria acrescentados após a execução. Nenhum commit, push, deploy, alteração de backend ou migration.

#### Resultado final do Bloco 2

- npm test com Node 24.14.0: sete arquivos de suíte aprovados, incluindo 20 testes novos de conta. Cobertura: loading, sessão expirada, erro/retry, dados somente leitura, avatar de iniciais/Unicode/fallback, exclusão de avatar/telefone não contratados, seis papéis, contexto selectedCompanyId, seleção explicitamente autorizada e falha, preferências existentes, ações de sessão, confirmação/cancelamento, bloqueio de duplicação, sucesso e falha de logout-all, erro de logout atual e defaults do header compartilhado.
- Testes antigos de conta atualizados para a nova regra explícita de ausência de seleção automática; testes de seleção automática no LOGIN permanecem aprovados.
- npm run lint: aprovado sem erros ou avisos. git diff --check: aprovado.
- npm run build: Turbopack falhou ao criar uma porta interna no processamento CSS (EPERM), tanto no sandbox quanto na tentativa externa autorizada. Logs: /tmp/next-panic-212acac08c96f13e6401075ad9725525.log e /tmp/next-panic-51f0ac07124023a1f8167fe5dc57f815.log. Não houve mudança de script/configuração/dependências para contornar a restrição.
- Alternativa suportada npm run build -- --webpack: aprovada, incluindo TypeScript, 21 páginas estáticas e páginas dinâmicas existentes. A primeira checagem de tipos detectou uma exportação auxiliar indevida em page.tsx; corrigida movendo AccountContent para components/account-content.tsx. Build de browser usou API reservada de fixtures; build final gerado novamente sem essa substituição.
- Chrome headless: 324 combinações (seis papéis × três seções × nove larguras × dois temas), em 360, 375, 390, 414, 768, 1024, 1280, 1440 e 1920px. Nenhum overflow da página, controle fora da viewport, exceção JavaScript ou header de duas linhas. Medição adicional garante que as iniciais cabem dentro do avatar; revisão visual corrigiu conflito de tamanho do avatar com o CSS anterior do shell.
- Interações de navegador aprovadas: navegação por âncoras, drawer com scroll bloqueado, Tab/Shift+Tab, Escape e retorno de foco; cancelamento de logout-all sem mutation; falha real simulada sem redirecionamento; retry e sucesso levando ao login; ausência de tenant POST ao abrir conta com uma empresa; seleção explícita com confirmação; avatar para Perfil e engrenagem para Preferências; tema persistente após reload; sessão expirada e erro de autenticação sem exposição do perfil.
- Regressão do Bloco 1: tests/design-system.browser.cjs executado, 324 combinações nas páginas administrativas/login/LP aprovadas, sem overflow ou exceções. Defaults do Super Admin, dashboard, avatar, +, menu, tema e navegação permanecem funcionando nos cenários simulados.
- Artefatos: /tmp/kalend-block2-account-browser.json, /tmp/kalend-block2-account-390.png e /tmp/kalend-block2-account-1440.png. Capturas mobile/desktop revisadas. Estes resultados usam fixtures, não sessão ou operações reais no DEV.
- Limitações: não há homologação autenticada DEV ou certificação integral com leitor de tela. Os cenários de edição, upload real e mudança de senha são bloqueados pelo contrato; não foram simulados como sucesso.

#### Auditoria dos arquivos e Git

Comparação com os hashes anteriores ao Bloco 2: somente os oito arquivos planejados existentes foram modificados, além de nove novos arquivos. Design tokens, tema, logo/assets PWA, service worker, AuthProvider, transporte de API, contratos AuthMe, dashboards, planos, trial, regularização, PagBank e demais módulos do Bloco 1 não foram alterados neste bloco. Nos componentes de shell compartilhados, os pontos opcionais e o avatar são alterações intencionais, validadas por regressão.

Branch develop. Nenhum arquivo staged. Sem commit, push, deploy, alteração em produção, backend ou migration. O status abaixo contém também as alterações prévias do Bloco 1; não deve ser confundido com o conjunto exclusivo deste bloco:

```text
 M app/conta/page.tsx
 M app/favicon.ico
 M app/layout.tsx
 M app/manifest.ts
 M app/page.tsx
 M app/styles/kalend-components.css
 M app/styles/kalend-plans.css
 M app/styles/kalend-tokens.css
 M app/styles/super-admin-shell.css
 M app/super-admin/empresas/page.tsx
 M app/super-admin/page.tsx
 M components/company-selector.tsx
 M components/dashboard-summary.tsx
 M components/plans/public-plans.tsx
 M components/super-admin/admin-shell.tsx
 M components/super-admin/header.tsx
 M components/super-admin/navigation.ts
 M components/super-admin/sidebar.tsx
 M components/theme/theme-control.tsx
 M components/theme/theme-provider.tsx
 M lib/theme.ts
 M public/icons/kalend-180.png
 M public/icons/kalend-192.png
 M public/icons/kalend-512.png
 M tests/company-selection.test.cjs
 M tests/design-system.browser.cjs
 M tests/design-system.test.cjs
?? components/account-content.tsx
?? components/account-profile.tsx
?? components/account-security.tsx
?? components/dashboard-charts.tsx
?? components/kalend-logo.tsx
?? components/user-avatar.tsx
?? docs/phase-4.3.md
?? lib/account-session.ts
?? lib/account.ts
?? lib/user-avatar.ts
?? public/icons/kalend-mark.svg
?? tests/account.browser.cjs
?? tests/account.test.cjs
```

### BLOCO 3 — CENTRAL DE NOTIFICAÇÕES

#### Auditoria e plano confirmado

A auditoria cobriu AuthProvider, `/auth/me`, sessão/cookies, `selectedCompanyId`, `lib/api`, `lib/push`, PushSettings, PWAProvider, `public/sw.js`, Prisma, AuthGuard/TenantGuard, comunicação, triggers de eventos, outbox, worker e scheduler no repositório irmão `kalend-api`. Foram lidos os guias instalados de Next.js para componentes cliente antes de alterar código.

Não existia histórico de notificações por destinatário, contagem ou leitura persistida. `GlobalPushSubscription`/`GlobalPushAuthorization` são dispositivos e consentimentos; `GlobalCommunicationOutbox`/`GlobalCommunicationDelivery` representam eventos e entregas. Nenhuma dessas estruturas possui o estado de leitura de uma central. Foram preservadas e reutilizadas, sem transformar a lista operacional de entregas em notificações pessoais.

Plano executado: adicionar a persistência necessária no backend; alimentar o histórico pela outbox existente; usar o scheduler existente para exclusão física; adicionar APIs autenticadas e o sino no Header compartilhado; reutilizar Drawer, AdminShell, AuthProvider, tema e PushSettings; criar `/conta/notificacoes`. Sem alterações dos Blocos 4–8.

#### Arquitetura implementada

`Evento real → trigger/outbox existente → NotificationsService.ingest → Notification por destinatário → APIs de leitura/contagem → sino/central`.

Separadamente: `evento processado para o histórico → worker de entregas existente → Push Web → service worker existente`. A consulta de expansão das entregas exige `notificationProcessedAt`, garantindo a ordem mesmo entre workers concorrentes. A ingestão independe de templates, provedores habilitados, subscription ou permissão do navegador. A preferência persistida do usuário pode desativar a criação de novas notificações no sistema sem apagar o histórico e sem alterar o consentimento independente de Push.

Os eventos comerciais atuais continuam destinados aos proprietários ativos autorizados, conforme o mecanismo de comunicação existente. O evento pessoal de segurança é destinado ao usuário ativo indicado pelo evento persistido, inclusive Super Admin e demais papéis; não exige empresa fictícia. A central e os endpoints aceitam os seis papéis, mas não divulgam eventos financeiros a todos os membros. Agendamentos e outros eventos sem fonte real neste backend não foram simulados.

A ingestão é transacional, usa `FOR UPDATE SKIP LOCKED`, processa até 100 eventos por execução e é idempotente por usuário/sourceKey. O cursor da ingestão permanece na outbox depois de expirar o histórico, impedindo recriação. Eventos desconhecidos ou antigos são consumidos sem gerar mensagens fictícias.

#### Modelos e retenção real

- `Notification`: usuário com FK, empresa opcional com FK, sourceKey interno, tipo extensível, título/mensagem em português, ação validada, createdAt, expiresAt e readAt. Exclusão de usuário/empresa remove registros relacionados. IDs e sourceKey não são apresentados na interface.
- `NotificationPreference`: preferência `inSystemEnabled` por usuário; padrão verdadeiro, gravada no banco e aplicável a todas as suas empresas.
- `GlobalCommunicationOutbox.notificationProcessedAt`: progresso independente da expansão de canais.
- Migration: `prisma/migrations/20261002120000_notification_inbox/migration.sql` no backend. Inclui índices de busca/contagem/expiração e marca o backlog já expirado como processado para não atrasar eventos novos.

**Sete dias completos após persistir a notificação:** `createdAt` usa UTC do banco; `expiresAt` é uma coluna PostgreSQL `GENERATED ALWAYS AS (createdAt + INTERVAL '168 hours') STORED`. Não é editável pelo cliente nem calculada pelo navegador. O Prisma representa a geração nativa com `dbgenerated()`. A migration SQL é a definição da coluna gerada; não substituir por sincronização automática de schema.

Listagem, contagem e mutações rejeitam expiradas usando horário UTC oficial do banco. A limpeza não depende dessas consultas: `NotificationsService.cleanup()` executa DELETE físico em lotes de até 1.000, com índice e `SKIP LOCKED`, pelo scheduler já existente. O scheduler limpa antes das demais tarefas; worker e scheduler ingerem eventos. Os comandos de ambos foram corrigidos de `dist/src/communication/...` para `dist/communication/...`, que é a saída real do build atual.

O código de limpeza e sua execução real foram testados localmente. **A operação automática no DEV depende da migration e da manutenção do timer externo supervisionado do scheduler**, com `COMMUNICATION_SCHEDULER_ENABLED=true`, e do worker com `COMMUNICATION_WORKER_ENABLED=true`. Nenhum timer de DEV foi instalado, banco existente migrado ou deploy feito. Recomenda-se confirmar periodicidade de um minuto e monitorar exclusões/backlog na homologação. A exclusão física é periódica; a API deixa de disponibilizar a notificação exatamente no limite do servidor, mesmo entre execuções. Grandes backlogs exigem execuções sucessivas do lote.

#### Contratos reais criados

Todos usam AuthGuard existente: cookies, verificação de sessão/usuário ativo, `Cache-Control: no-store` e origem autorizada nas mutações. Não aceitam userId, role ou companyId para autorização.

| Método/rota | Contrato |
| --- | --- |
| `GET /notifications/unread-count` | `{ unreadCount, serverNow, companyId }`; consulta count dedicada, sem buscar o histórico |
| `GET /notifications?filter=all\|unread\|read&limit=20&cursor=...` | `{ items, nextCursor, serverNow, companyId }`; limite de 1–20, cursor opaco validado e ordem estável createdAt/id |
| `POST /notifications/:id/read` | Corpo `{}`; `{ updated, serverNow, companyId }`; idempotente, 404 para registro alheio/inacessível/expirado |
| `POST /notifications/read-all` | Corpo `{}`; marca somente não lidas do próprio contexto autorizado |
| `GET /notifications/preferences` | `{ inSystemEnabled }` real ou padrão verdadeiro |
| `PUT /notifications/preferences` | Corpo somente `{ inSystemEnabled: boolean }`; devolve preferência persistida |

Item público: id, type, title, message, actionUrl/actionLabel, scope GLOBAL/COMPANY, companyId/company.name, createdAt, expiresAt, readAt. Não devolve sourceKey, usuário destinatário, JSON interno ou credenciais.

Escopo: próprio usuário e `(companyId nulo OU empresa selecionada)`. Empresa selecionada vem da sessão e exige vínculo ativo/empresa ativa no banco; todos os papéis de membership são aceitos. Sem empresa, somente globais próprias. Super Admin sem tenant vê suas globais; não recebe acesso à caixa de outros usuários. URLs são uma allowlist explícita de destinos de Minha conta no backend e no frontend, sem URL externa, protocolos especiais, query strings, redirecionamentos de autenticação ou caminhos arbitrários.

O cliente reutiliza `withTenantLock`, confirma usuário/empresa em `/auth/me` e confere o contexto devolvido pelo endpoint. Componentes têm chave por identidade/empresa e descartam respostas obsoletas. Não há dados de notificações ou estado de leitura no localStorage, nem transporte/autenticação paralelo.

#### Frontend e Push Web

Sino no Header existente de uma linha; tooltip, aria-label, aria-expanded e aria-controls; badge até 99+. Contagem atualizada a cada 60 segundos enquanto a janela estiver visível, ao retomar foco, após leitura e ao receber o aviso do SW. A listagem resumida só é buscada quando o painel abre (seis itens); o carregamento normal do header não busca 100 mensagens.

Painel compacto desktop e drawer mobile reutilizam o Drawer: Escape, foco inicial, contenção de Tab/Shift+Tab, fechamento pelo controle/backdrop e retorno ao sino. Central completa usa a navegação de Minha conta no mesmo shell; filtros, paginação incremental, mensagens acessíveis de sucesso/erro, retry, loading, destaque de não lidas e ações que aguardam leitura persistida antes de navegar. “Ver todas” e preferências são ações diretas.

PushSettings e `lib/push` continuam responsáveis pela permissão, VAPID, subscription e dispositivos reais. A central apenas reutiliza esses componentes. Estados: indisponível, permissão pendente, bloqueado, não configurado, ativo verificado ou erro. `lastSeenAt` disponível no contrato backend foi integrado como último acesso, sem datas inventadas. Payload Push aponta somente para `/conta/notificacoes`; SW mantém a validação de URLs e informa clientes da mesma origem com `KALEND_NOTIFICATION_RECEIVED`, sem expor payloads ou criar notificações no frontend. Não há novo SW, OneSignal ou Push App.

#### Arquivos exclusivos deste bloco

Frontend, criados:

- `app/conta/notificacoes/page.tsx`
- `components/notification-bell.tsx`
- `components/notification-center.tsx`
- `components/notification-list.tsx`
- `components/use-notifications.ts`
- `lib/notifications.ts`
- `tests/notifications.test.cjs`
- `tests/notifications.browser.cjs`

Frontend, alterados sobre os Blocos 1–2:

- `components/account-content.tsx` — destino real da central na navegação existente, sem duplicar logout/header.
- `components/super-admin/header.tsx` — sino no header compartilhado.
- `components/ui/drawer.tsx` — rótulo de fechamento opcional, padrão anterior preservado.
- `app/styles/super-admin-shell.css` — estilos sem nova paleta, largura móvel e painel compacto.
- `components/push-settings.tsx`, `lib/push/client.ts` — estados explícitos e último acesso real.
- `public/sw.js` — destino permitido da central e aviso de atualização a clientes locais.
- `tests/account.test.cjs`, `tests/company-selection.test.cjs`, `tests/design-system.test.cjs` — isolamento dos novos componentes nos testes dos blocos anteriores.
- `docs/phase-4.3.md` — esta documentação.

Backend `kalend-api`, criados:

- `prisma/migrations/20261002120000_notification_inbox/migration.sql`
- `src/notifications/notifications.module.ts`
- `src/notifications/notifications.service.ts`
- `src/notifications/notifications.spec.ts`
- `test/support/validate-notification-inbox.mjs`
- `docs/NOTIFICATION-INBOX.md`

Backend, alterados: `package.json`, `prisma/schema.prisma`, `src/app.module.ts`, `src/communication/engine.ts`, `src/communication/push.ts`, `src/communication/push.spec.ts`, `src/communication/worker.ts`, `src/communication/scheduler.ts`. Alterações anteriores de billing/PagBank/auth/documentação do backend foram preservadas.

#### Validação e limitações de homologação

- Frontend `npm test`: oito arquivos de suíte passando; 16 casos novos de notificações, além das regressões anteriores.
- Backend `npm test`: 31 arquivos e 483 testes passando; contratos, papéis, autorização, leitura, cursor, preferência e limpeza incluídos.
- Backend `npm run test:e2e`: seis arquivos, 116 testes passando, preservando autenticação, comunicação e Push existentes.
- PostgreSQL 16 descartável, separado de qualquer banco existente: 60 verificações passando. Todas as migrations aplicadas somente nesse banco; APIs HTTP com cookies/JWT reais, origem/CSRF, seis papéis, isolamento, revogação, leitura idempotente, filtros/paginação, preferência, coluna gerada, expiração, exclusão pelo scheduler real, worker real, concorrência de ingestão e entrega aguardando persistência. Script recusa banco já existente e remove somente o criado por ele. Não lê DATABASE_URL para selecionar alvo.
- Chrome local com fixtures: 216 combinações para central/painel em seis papéis × nove larguras × dois temas × duas visualizações. Interações: Enter/Space/Escape, Tab/Shift+Tab, foco, paginação, leitura/erro/retry, todas lidas, badge, loading, preferências, troca de empresa, sessão expirada e logout.
- Regressão visual: 324 combinações de Minha conta (Bloco 2) e 324 combinações do Design System/rotas (Bloco 1), sem falhas ou exceções.
- Larguras: 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920; temas claro/escuro. Foco visível, labels, contraste por tokens já verificados, sem animações novas e reduced motion preservado. Não representa certificação integral com leitor de tela.
- Frontend lint, backend lint e `git diff --check` em ambos os repositórios: sem erros. Backend build Nest/TypeScript passou.
- `npm run build` Turbopack falhou por restrição ambiental ao abrir porta/processar CSS, inclusive após tentativa fora do sandbox. Logs: `/tmp/next-panic-48c19cab3792d69b28bdc43428ae35b9.log` e `/tmp/next-panic-47c376a71a3c343d11586a4d39464703.log`. Alternativa `npm run build -- --webpack` passou com TypeScript e 22 páginas estáticas, incluindo a nova central. O build final é refeito sem URL de fixture; o script padrão do projeto não foi alterado.

**Pendente para concluir a homologação do Bloco 3:** aplicar a migration no DEV mediante autorização, conferir cadência/estado do scheduler e worker supervisionados, validar sessão real com as empresas/papéis disponíveis no DEV e realizar envio/recebimento/clique/desativação de Push num navegador com VAPID e provedor real. Testes locais não são prova de entrega externa Push, passagem real de sete dias ou de timer DEV já instalado. A coluna gerada, a passagem do limite e a remoção física foram verificadas no banco descartável; nenhuma limpeza depende de abrir a página.

Não faltam endpoints para os fluxos implementados. Eventos além do catálogo atual exigem uma fonte backend autorizada e política explícita de destinatários antes de integração; não foram criados alertas falsos. Push App/Gmail/WhatsApp/templates e APIs de edição de perfil/senha/avatar continuam fora deste bloco.

Git: ambos em develop, alterações locais não staged. Comparação com baseline dos Blocos 1–2 preservou tema, tokens, logo/assets PWA, AuthProvider, transporte API, selectedCompanyId, dashboard, planos, trial, regularização e PagBank. Somente os pontos compartilhados listados acima foram estendidos intencionalmente. Nenhum commit, push, deploy ou alteração em produção. A fase e o Bloco 3 não são declarados homologados no DEV.
