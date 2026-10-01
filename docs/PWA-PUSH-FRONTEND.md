# Fase 4.1-B — auditoria e entrega frontend

## Auditoria antes da implementação

Árvore limpa na branch develop. Next 16.3.6, React 19.2.8, TypeScript 5, Tailwind 4, ESLint 9; App Router preservado. Guias locais de PWA, manifest e CLI da versão instalada lidos. package.json/lock sem mudança de dependências. Sem middleware/proxy, manifest, SW, Workbox, next-pwa, PushManager, Notification, VAPID ou beforeinstallprompt no frontend. Push aparecia apenas como PUSH_PENDING/“Em breve” na comunicação.

RootLayout aplica fontes Geist/Geist Mono e AuthProvider; Super Admin protege montagem e permissões; /conta concentra sessão e seleção de empresa. Componentes comerciais/comunicação existentes reutilizados visualmente. public tinha apenas SVGs padrão do Next, além do favicon padrão em app. O login já usa CalendarDays + K, gradiente #8178ff/#6558f5: os PNGs reproduzem essa identidade, sem novo logotipo. Ícones 180 (Apple), 192 e 512 (manifest).

lib/api.ts é o único transporte: NEXT_PUBLIC_API_URL obrigatório, credentials include, cache no-store, cookies administrados pelo backend, refresh e BroadcastChannel/Web Locks. Não há tokens em JavaScript nem tratamento novo de cookies. withTenantLock também protege mudanças de contexto entre abas. Não havia headers customizados no next.config.ts; adicionados somente os headers específicos do SW. Nenhuma variável secreta ou variável VAPID nova.

Backend irmão consultado somente em leitura: phase3.controller.ts, push.ts e configuration.ts. Não houve chamada real à API DEV, incompatibilidade comprovada nem modificação no backend.

## Implementação e arquivos

- app/manifest.ts: manifest nativo do App Router, nome/short_name Kalend, id/scope /, start_url /conta, standalone, cores da identidade.
- public/icons/kalend-{180,192,512}.png: identidade existente em dimensões próprias para instalação.
- public/sw.js: install, activate/claim, atualização explícita, push/showNotification, notificationclick/navigate/focus/openWindow.
- components/pwa-provider.tsx e lib/push/install.ts: registro global do SW, instalação apenas quando beforeinstallprompt existe, detecção standalone/appinstalled, instrução iOS e banner de atualização com aviso para salvar trabalho.
- lib/push/client.ts: suporte/permission, contexto, configuração pública, listagem, registro, atualização, remoção e identificação local.
- components/push-settings.tsx: área Notificações na conta, estado atual, lista de dispositivos e ações, erros genéricos e instrução para bloqueio.
- app/conta/page.tsx e app/super-admin/layout.tsx: painel e acesso à conta.
- app/layout.tsx: provider PWA, viewport/themeColor e metadata Apple.
- app/globals.css: controles flexíveis, quebra de texto e botões sem largura fixa, para 320–desktop; não substitui estilos globais.
- components/communication-providers.tsx e lib/communication.ts: Push exibe estado do backend e link para gerenciamento; configuração administrativa de chaves continua fora desta entrega.
- next.config.ts: SW no-store/nosniff, scope / e CSP sem conexões de rede.
- tests/push.test.cjs: mocks de navegador/API, fixtures sem subscription real, execução do SW em VM.
- tests/communication.test.cjs: mocks de infraestrutura atualizados para novos imports backend Push/Gmail; validadores SMTP/Meta e transport Evolution continuam reais.

## Contrato, sessão e dispositivos

GET /communication/push/public-config retorna available, publicKey, environment; provider/nativeAvailable também existem no backend. Consultado somente em contexto autenticado. Configuração carregada antes do clique; requestPermission permanece diretamente associado ao gesto do usuário, antes de operações assíncronas. Nenhuma permissão automática.

POST /communication/push/subscriptions envia apenas provider WEB_PUSH, platform WEB/ANDROID/IOS, label genérico navegador/SO, endpoint, keys p256dh/auth e expirationTime. Não envia userId nem companyId: backend deriva ambos da sessão. Cada leitura/mutação verifica /auth/me dentro do lock existente, comparando usuário e empresa. Usuário comum sem empresa não registra; Super Admin pode gerenciar contexto administrativo sem empresa, conforme contrato existente. Servidor continua sendo autoridade para permissões/membership.

GET subscriptions retorna somente metadados, sem endpoint/chaves. IndexedDB armazena exclusivamente o ID público do registro associado ao usuário e SHA-256 do endpoint local; nenhum endpoint, subscription ou chave é persistido pela aplicação. A subscription criptográfica continua no armazenamento nativo do navegador. Se IndexedDB estiver indisponível ou limpo, não se tenta adivinhar o dispositivo por label: uma ativação explícita faz POST idempotente e recupera o ID. A API controla propriedade; uma subscription pertencente a outro usuário não é reassociada pelo cliente.

Subscriptions locais válidas são reutilizadas. POST atualiza chaves/metadados e consentimento da empresa explicitamente; outros dispositivos permanecem intactos. Subscription expirada é substituída durante ativação. Mudança de chave VAPID exige remoção explícita, sem unsubscribe silencioso. Erro no registro mantém subscription local para retry; não declara ativação bem-sucedida.

PUT /subscriptions/:id com {active:boolean} pausa/reativa consentimento da empresa; no contexto administrativo sem empresa, controla estado global. DELETE revoga o dispositivo em todas as empresas (com confirmação explicando esse efeito); se for o atual, unsubscribe ocorre depois da revogação backend. Remover um dispositivo remoto não desinscreve o atual. Evento existente de sessão encerrada desinscreve o navegador em melhor esforço para reduzir entrega a conta anterior; registro backend pode permanecer sem revogação até limpeza de endpoint inválido. Falha/offline nesse cleanup continua sendo uma limitação de homologação em navegador real.

Estados unsupported, permission-default/granted/denied, subscribed, unsubscribed e error. Permissão negada nunca gera loop; usuário recebe orientação para configurações do site. Interface não expõe IDs, endpoints ou material criptográfico. Não há logs de dados Push.

## SW, segurança e instalação

SW não possui fetch handler, Cache Storage nem armazenamento de dados privados. Sem offline funcional: todas as páginas/API seguem pela rede, inclusive dados financeiros e sessão. Também não guarda cookies/tokens/chaves VAPID. Notificações usam texto puro e limites de tamanho; payload inválido recebe texto genérico. Backend atual envia version/title/body; icon/badge/url são opcionais futuros compatíveis.

Clique valida origem, protocolo implícito da origem, credenciais, query/hash e allowlist de caminhos /, /conta e /super-admin/...; URL externa, javascript, auth/API e parâmetros caem em /conta. Validação repetida no clique. Imagens limitadas aos ícones locais. Foca/navega janela Kalend existente; abre outra se necessário. Rotas continuam protegidas pela autenticação existente.

Atualizações esperam ação do usuário; KALEND_UPDATE aceita somente cliente da própria origem. Instalação some após appinstalled/standalone; cancelamento não força novo prompt. iOS recebe instrução para Tela de Início; disponibilidade depende do navegador. Headers devem ser preservados pelo proxy de DEV.

## Homologação DEV pendente — não produção

Após revisão e implantação autorizada em outra etapa, build com NEXT_PUBLIC_API_URL=https://api-dev.kalend.tech. A URL do frontend é https://dev.kalend.tech. Este trabalho não fez deploy.

Em Chrome desktop e Chrome Android, verificar:

1. Manifest /manifest.webmanifest e três PNGs; SW /sw.js no scope / e headers corretos. Instalar pela UI quando o navegador disponibilizar; reabrir standalone.
2. Login, selecionar empresa, abrir Minha conta, confirmar ausência de prompt automático.
3. Ativar, permitir, conferir POST e dispositivo na listagem sem copiar endpoint/chaves para relatórios/logs.
4. Reabrir: mesmo dispositivo, sem duplicação. Repetir em Android: segundo registro, sem sobrescrever desktop.
5. Desativar para empresa A; empresa B permanece independente. Trocar empresa e consentir explicitamente. Testar múltiplas abas e sessão encerrada.
6. Super Admin autenticado pode usar o mecanismo EXISTENTE POST /communication/providers/PUSH_PENDING/send-test com {} (rota protegida, sem endpoint público novo). Envia aos dispositivos do próprio administrador; resposta aceita não comprova entrega. Para usuário comum, usar evento autorizado já existente, sem promover usuário nem fabricar endpoint.
7. Conferir recebimento, janela existente focada e abertura em /conta ao clicar (payload backend atual não contém URL). Repetir com app fechado.
8. Testar denied/default, API indisponível, refresh e reconexão, remoção local/remota, nova ativação depois de logout e atualização do SW.
9. Medir overflow e acessibilidade em 320,375,390,430,768px e desktop. Esta execução verificou CSS e mocks, sem homologação visual em browser.

Não há suíte E2E/browser instalada no projeto. Mocks não comprovam instalação efetiva, cookies/CORS reais, entrega de Push nem layout em aparelhos. Todas essas verificações permanecem pendentes, assim como publicação DEV, explicitamente não autorizada neste trabalho.

## Resultado da validação local

Node do shell era 18.19.0; foi usado Node 22.23.2 já disponível no ambiente para a validação compatível com Next 16. Nenhuma instalação de dependências ou migração de framework.

- npm test: PASS nas três suítes; 39 casos novos de Push/PWA passando (verificação direta adicional), além de comunicação e integração existentes. Nenhuma subscription real.
- npm run lint: PASS, sem warnings.
- npx tsc --noEmit: PASS.
- npm run build padrão: NÃO CONCLUÍDO. Primeiro bloqueio: download de fontes Geist no sandbox. Repetição escalada: Turbopack não consegue criar porta interna (Operation not permitted). Não é apresentado como build padrão aprovado.
- npm run build -- --webpack: PASS (execução escalada), compilação, TypeScript e geração de 18 páginas; /manifest.webmanifest gerado. Flag oficial documentada pelo Next local, sem mudança no script/bundler padrão.
- git diff --check: PASS.
- E2E: não existe suíte instalada; não executado. Navegador/DEV/Android e medição real de larguras: pendentes.
- Branch: develop. Sem commit, push, deploy ou alteração em main/backend.

Git diff --stat (somente rastreados): 8 arquivos, 36 inserções, 8 remoções. Os novos arquivos não rastreados não entram nesse comando; estão listados acima.

Git status --short final:

```text
 M app/conta/page.tsx
 M app/globals.css
 M app/layout.tsx
 M app/super-admin/layout.tsx
 M components/communication-providers.tsx
 M lib/communication.ts
 M next.config.ts
 M tests/communication.test.cjs
?? app/manifest.ts
?? components/push-settings.tsx
?? components/pwa-provider.tsx
?? docs/PWA-PUSH-FRONTEND.md
?? lib/push/
?? public/icons/
?? public/sw.js
?? tests/push.test.cjs
```

Entrega disponível para revisão de código, mas o aceite completo desta fase permanece NÃO PRONTO enquanto o build padrão e a homologação real exigida não forem concluídos. Nenhuma incompatibilidade backend foi comprovada por resposta real; o contrato local é compatível.

## Preparação para homologação DEV — verificação posterior

Investigação de build: package.json mantém build `next build` e start `next start`; Next instalado 16.3.6, Tailwind/@tailwindcss/postcss 4.3.3. PostCSS usa somente o plugin Tailwind existente. next.config.ts contém somente headers do SW, sem configuração de Turbopack/porta. Não havia variáveis NEXT/TURBO/NODE_OPTIONS/POSTCSS/TAILWIND/PORT no ambiente inspecionado. Node 22.23.2 existente foi selecionado sem instalar runtime ou alterar scripts.

O panic log `/tmp/next-panic-1249a60fb123b60f5877d772a1b9f3ff.log` indica CSS → evaluate_webpack_loader → subprocesso → bind → EPERM (os error 1). Não é EADDRINUSE. O ambiente atual tem filtro seccomp ativo e NoNewPrivs. O relatório anterior de Comunicação já registra reprodução em uma cópia limpa da Fase 1. Não há evidência de configuração incorreta do projeto causando essa negação. A regra exata de isolamento que negou o syscall não aparece no log.

Nesta verificação, `npm start -- --hostname 127.0.0.1 --port 4317` também retornou listen EPERM no sandbox. Em execução escalada, o mesmo comando iniciou normalmente. Uma consulta HTTP no sandbox falhou já na criação do socket; em execução escalada passou. Essas evidências confirmam restrição de sockets no ambiente sandbox. Nenhuma configuração foi alterada para resolver ou esconder o erro.

Build executado: `NEXT_PUBLIC_API_URL=https://api-dev.kalend.tech npm run build -- --webpack`, com Node 22.23.2. A primeira tentativa no sandbox falhou ao interpretar saída de TypeScript --showConfig; repetição escalada passou, incluindo compilação, TypeScript, geração de 18 páginas e traces. Script padrão preservado; Turbopack não foi executado novamente nesta etapa.

Teste HTTP local, com servidor limitado a 127.0.0.1:4317:

- /conta: 200, HTML com verificação inicial da sessão.
- /super-admin: 200, HTML com verificação inicial da sessão.
- /manifest.webmanifest: 200, application/manifest+json; Kalend, start_url /conta, scope /, display standalone, cores corretas, ícones 192/512.
- /sw.js: 200, application/javascript; Cache-Control no-cache/no-store/must-revalidate, Service-Worker-Allowed /, CSP e nosniff corretos.
- /icons/kalend-180.png, /icons/kalend-192.png, /icons/kalend-512.png: 200, image/png.
- Metadata nas duas páginas inclui manifest, apple icon e theme-color.

Servidor temporário encerrado (SIGINT, saída 130). Sem Push real, sessão DEV ou browser; resposta HTTP não comprova hidratação, autenticação, instalação ou entrega de notificação.

Preparação operacional: domínio informado pelo projeto https://dev.kalend.tech; única variável pública necessária NEXT_PUBLIC_API_URL=https://api-dev.kalend.tech no BUILD. Nenhuma variável frontend VAPID privada/pública adicional é necessária; public key vem da API. Next production usa `npm start`, com host/porta conforme infraestrutura existente. PM2 não está disponível neste ambiente local, não há ecosystem/deploy config no repo e o diretório/processo remoto não foram identificados. Não se deve confundir o workspace local com o diretório implantado no servidor DEV.

Não foi possível fornecer um comando PM2 exato sem o nome/caminho existentes. A forma esperada, a confirmar no servidor, é `pm2 restart <processo-DEV-confirmado> --update-env`; não foi executada. Host/alias SSH, diretório e processo DEV foram solicitados ao usuário para inspeção somente. Nenhuma conexão remota, deploy, commit, push, alteração backend/PagBank/produção/main ou alteração de código/configuração foi realizada.

Resultado: build e HTTP local aprovados; NÃO PRONTO PARA DEPLOY CONTROLADO DO FRONTEND DEV até confirmar o diretório e processo de execução DEV. Homologação Chrome desktop/Android e responsividade real continuam pendentes.
