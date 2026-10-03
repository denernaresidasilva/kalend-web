# Fase 1 — experiência simplificada de Push Web

O convite permanece em `app/layout.tsx`, dentro do AuthProvider, sem implementação por papel. O convite abre um dialog central com foco e bloqueio de interação nativos. O dialog consulta a configuração pública autenticada antes de liberar a ativação; a permissão é solicitada diretamente no clique, usando a configuração preparada. Uma chave pública malformada é rejeitada antes da permissão.

A ativação reutiliza `enable`, o POST existente e a validação de usuário/empresa sob tenant lock. Permissão concedida com inscrição ausente, expirada ou vínculo de sessão ausente continua usando a recuperação existente. Uma pausa explícita não é revertida automaticamente. Permissão bloqueada não causa convite recorrente e o modal acionado manualmente explica como desbloquear. Cancelar fecha a experiência para a entrada atual; nova navegação/login pode convidar novamente.

A tela da conta mostra estado simples, ativação pelo mesmo modal e teste com loading, texto amigável e requestId idempotente. O estado ativo exige inscrição válida, configuração compatível, autorização ativa e vínculo da sessão. O teste usa a API existente: `queued: true` significa aceitação para envio, não confirmação de entrega no navegador. O texto pedido “✓ Notificação enviada.” representa essa aceitação.

## Diagnóstico do botão desabilitado

A tela anterior usava `disabled={busy || denied || !config?.available}`. A mensagem “Push Web não configurado no servidor” só aparecia depois de uma configuração retornada com `available` falso; um erro HTTP seguia outro caminho de erro.

O backend local (`kalend-api/src/communication/push.ts`, `GlobalPush.publicConfiguration`) retorna HTTP 200 com `available: false`, `publicKey: null` quando o registro `globalCommunicationProvider` de `PUSH_PENDING` não existe, não está habilitado, não tem escopo GLOBAL ou não tem status CONNECTED. O par VAPID configurado é validado quando o provedor está conectado. Essa configuração é persistida no backend, não fornecida por uma variável VAPID do frontend. A única variável frontend é NEXT_PUBLIC_API_URL, definida no build.

Consulta sem credenciais ao DEV: GET https://api-dev.kalend.tech/communication/push/public-config retornou HTTP 401. O endpoint é protegido por AuthGuard apesar do nome public-config: “public” refere-se à chave retornada, não a acesso anônimo. Sem uma sessão autenticada do DEV ou leitura do provedor remoto, não é possível distinguir qual condição ocorreu na homologação. Não houve alteração da configuração remota nem geração de chaves. GET subscriptions e POST subscriptions preservam o contexto da sessão autenticada e não foram executados com uma conta real do DEV nesta etapa.

A disponibilidade continua sendo respeitada: o usuário consegue abrir o modal, mas não solicitar permissão/registrar enquanto a configuração está indisponível. O modal explica a indisponibilidade com texto simples. Não há chave inventada ou segredo no frontend.

## Limites preservados

A API existente exige empresa selecionada para usuários comuns; Super Admin pode usar o contexto sem empresa. O convite está disponível em todos os papéis, mas não contorna essa autorização: uma conta comum sem empresa deve escolher sua empresa antes de registrar. Nenhum backend, migration ou contrato foi alterado.

Logout/logout-all, revogação, isolamento, mapeamento local por usuário, idempotência e limpeza do navegador permanecem. Service Worker não foi alterado: push, notificationclick, actions, safeUrl, safeImage e KALEND_NOTIFICATION_RECEIVED permanecem cobertos pelos testes existentes. Diagnóstico/configuração técnica permanecem no Super Admin de comunicação, fora da tela simplificada da conta.

## Validação

Testes abrangem convite, estado ativo, abertura do modal, cancelamento, nova navegação, sucesso, erro, bloqueio de permissão, recuperação, papéis, lock entre abas, chave inválida, estado vinculado à sessão, teste com idempotência e limpeza local por session-ended. Os testes de conta e integração preservam os endpoints de logout/logout-all.

Build executado com Node 24.21.0 e `npm run build` (Turbopack). O Node padrão 18 é incompatível com Next 16.3.6. O build em sandbox ficou sem progresso na compilação; fora do sandbox passou com TypeScript e geração das páginas. `npm test`, `npm run lint` e `git diff --check` executados. Sem commit, push ou deploy. A entrega real do Push no DEV continua dependente da configuração e sessão remotas.
