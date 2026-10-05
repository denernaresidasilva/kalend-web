# Fase 1 — Push Web e painéis autenticados

## Estado da entrega

Alterações locais em develop. Sem commit, push, deploy, migration ou alteração de banco, configuração, credenciais e produção. A Fase 1 ainda não está homologada: permissão nativa, subscription e recebimento real no DEV dependem de uma sessão autenticada disponível para diagnóstico. Testes automatizados locais não comprovam entrega Web Push.

## Diagnóstico confirmado

O modal anterior consultava a configuração ao montar e renderizava o erro quando `prepared.failed` era verdadeiro, antes de qualquer tentativa do usuário. Além disso, `disabled={!prepared.config || busy}` impedia o clique quando a preparação falhava. Portanto a falha acontece na preparação do modal, antes de `Notification.requestPermission()`. Essa falha pode ser de suporte, sessão, transporte, configuração indisponível ou chave ausente; a interface anterior agrupava todas essas causas.

Consulta real em 03/10/2026, sem credenciais: `GET https://api-dev.kalend.tech/communication/push/public-config` retornou HTTP **401**. `GET https://dev.kalend.tech/super-admin` e `GET https://dev.kalend.tech/sw.js` retornaram **200**. O HTML público da aplicação não comprova autenticação. O SW publicado contém push, notificationclick, actions, safeUrl, safeImage e KALEND_NOTIFICATION_RECEIVED.

Não foi obtida a resposta de public-config na sessão da homologação. Não é possível afirmar qual condição do provider ocorre no DEV, nem que esse 401 seja o erro do navegador autenticado.

O backend local confirma que public-config exige AuthGuard. Quando disponível, retorna a chave pública. Retorna `available: false`, `publicKey: null`, `environment: null` se o provider `PUSH_PENDING` estiver ausente, desabilitado, fora de GLOBAL ou sem status CONNECTED. A resposta não diferencia essas condições. Uma configuração VAPID inválida também pode falhar na validação do backend.

`POST /communication/push/vapid` é uma operação administrativa de geração e persistência de chaves, com AdminGuard. Não deve ser chamada na ativação de um navegador. Nenhuma chave foi gerada nesta entrega.

## Correção e dependências

O convite usa sempre o texto simples solicitado. Com permissão default, a inspeção não consulta configuração nem pede permissão: convida somente em um contexto autorizado. O modal prepara Service Worker e configuração pública antecipadamente, mas não mostra erros dessa preparação. O erro amigável só aparece após clicar Ativar agora.

Se a preparação estiver pronta, a ativação mantém a solicitação nativa diretamente na cadeia do clique, sem nova consulta de rede antes dela. Se a preparação falhou, o clique tenta novamente o preparo do worker e a configuração real; indisponibilidade continua impedindo permissão e registro. Não há bypass nem chave fictícia. Navegadores com exigência estrita de gesto podem exigir nova tentativa quando a preparação depende de rede; esse cenário precisa de homologação real.

Suporte e contexto autenticado são necessários para ativação. A permissão nativa, isoladamente, não necessita VAPID; a criação da subscription necessita uma chave válida. Mantivemos a validação antes da permissão para não pedir autorização quando não é possível concluir o registro. A configuração pronta é validada em enable antes de requestPermission, incluindo formato da chave.

Permissão granted não é solicitada novamente. A recuperação de inscrição ausente, expirada, revogada ou sem vínculo da sessão reutiliza o fluxo existente. Estado ativo exige subscription compatível com VAPID, registro ativo e `registeredInCurrentSession === true`. Uma pausa explícita continua preservada. Denied não gera convite recorrente e o modal manual explica as configurações do navegador, sem chamar requestPermission.

## Autenticação, rotas e painéis

Não foi criado outro AuthProvider. O popup continua único no layout raiz, dentro do AuthProvider. Fica oculto enquanto loading, com erro de autenticação ou profile ausente. A autorização de rota adicional usa uma lista fechada e o contexto real de `/auth/me`.

Rotas públicas existentes: `/` (login), `/planos` (catálogo público), manifest e recursos estáticos. Cadastro, primeiro acesso e recuperação de senha não possuem páginas neste repositório; permanecem excluídos por padrão. `/planos` não exibe popup, mesmo com sessão autenticada.

Rotas autenticadas: `/conta` e subrotas notificacoes, planos, regularizar; `/super-admin` e suas subrotas; os novos painéis. Usuário comum precisa de selectedCompanyId correspondente a uma membership retornada pela API. Sem empresa válida não há popup; a seleção existente em login/conta permanece responsável pelo contexto. Super Admin pode acessar suas rotas sem empresa. Em painel de outro papel, não há popup e o layout redireciona para o destino autorizado.

| Papel | Destino |
| --- | --- |
| Super Admin | `/super-admin`, estrutura existente preservada |
| Proprietário | `/painel/proprietario` |
| Administrador da empresa, papel existente ADMIN | `/painel/proprietario` |
| Profissional | `/painel/profissional` |
| Recepcionista | `/painel/recepcionista` |
| Cliente | `/painel/cliente` |

Os quatro novos painéis compartilham layout, cabeçalho com identidade/tema/perfil/sino, navegação Painel/Minha conta/Notificações e área vazia. Reutilizam AdminShell com navegação específica, sem expor os módulos administrativos aos demais papéis. Preservam o guard comercial existente, agora aplicado às novas rotas. Cada destino deriva da membership da empresa selecionada; ADMIN compartilha a estrutura do proprietário sem ganhar autorização adicional na API.

A conta ganhou link para retornar ao painel. Configuração e diagnóstico técnicos existentes continuam em `/super-admin/comunicacao`; nenhum módulo de negócio foi acrescentado.

## Web, PWA e segurança

Web e PWA usam o mesmo layout, AuthProvider, popup e Service Worker, sem duplicação. O manifest inicia em `/conta`; uma sessão ausente mostra o acesso ao login, sem popup. Após login os destinos são os mesmos da Web. O SW não possui cache de páginas autenticadas/API e não foi modificado.

Mantidos tenant lock, confirmação de usuário/empresa em `/auth/me`, mapeamento local por usuário e hash do endpoint, POST subscriptions e session binding realizado pelo backend. GET subscriptions usa usuário, sessão e empresa derivados da autenticação. Nenhum ID de usuário/sessão/empresa é inventado ou enviado como substituto da sessão. Logout e logout-all existentes continuam acionando revogação no servidor e limpeza local do PwaProvider após sucesso. Esses comportamentos têm cobertura local, mas não foram executados com usuário real no DEV nesta entrega.

safeUrl, safeImage, notificationclick, actions e KALEND_NOTIFICATION_RECEIVED foram preservados. Testes existentes verificam URLs internas, rejeição de destinos externos/API/credenciais/query/hash, clique no corpo e action. Recebimento, clique e action reais no DEV **não foram comprovados**.

`/conta/notificacoes` conserva a central existente e as preferências, com PushSettings simples: status, ativação pelo modal compartilhado e teste. O teste real usa POST `/communication/push/test`, requestId idempotente e exige `queued: true`. “✓ Notificação enviada.” indica aceite na fila; não comprova entrega pelo worker nem recebimento no navegador. Não houve envio de teste com sessão real nesta entrega.

## Arquivos

- components/push-notification-prompt.tsx; lib/push/prompt.ts; novo lib/push/routes.ts.
- lib/company-selection.ts; components/commercial-entry.tsx; components/account-content.tsx.
- novo app/painel/layout.tsx e páginas proprietario, profissional, recepcionista, cliente.
- tests/push-routes.test.cjs e atualização de push-prompt, company-selection, account e design-system.
- Este relatório. PushSettings, AuthProvider, PwaProvider, contratos de API e public/sw.js não foram alterados.

## Validação

`npm test`: passou, 11 arquivos de teste. A cobertura inclui visitor/loading/public routes, papéis/empresa, modal sem erro prematuro, tentativa/retry, permission granted/denied, recuperação, ausência de inscrição, logout/logout-all, lock contra duplicação, teste idempotente e segurança do SW. Fixtures dos testes são isoladas; nenhuma resposta de teste foi usada para diagnosticar o DEV.

`npm run lint`: passou. `npm run build`: passou com Node 24.21.0, compilação/TypeScript/geração de 26 páginas. O Node padrão 18.19.0 é incompatível com Next 16.3.6. A tentativa no sandbox ficou sem progresso e foi interrompida; o build local autorizado fora do sandbox passou. `git diff --check`: passou.

## Pendências para homologação

Obter em sessão autenticada o status HTTP e os campos não sensíveis available, publicKey presente/ausente e environment de GET public-config. Se available false, consultar somente a configuração administrativa existente de Push em Super Admin > Comunicação para identificar o motivo exato. Não gerar VAPID, habilitar provider, alterar banco ou configuração sem autorização expressa. Conforme o resultado, a configuração necessária pode ser provider GLOBAL, par VAPID válido, validação de conexão e habilitação; ainda não sabemos qual dessas etapas falta.

Depois disso, validar Chrome/PWA, permissão nativa, subscription, GET/POST, vínculo e isolamento, logout/logout-all, envio/outbox/delivery, recebimento real, clique e action. As alterações locais ainda não estão publicadas no DEV por instrução do usuário. A Fase 1 permanece pendente desses testes reais.
