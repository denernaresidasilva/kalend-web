# Integração do Super Admin

Contrato consultado diretamente: `../kalend-api/docs/FRONTEND-API.md` e `AUTHENTICATION.md`.

## Autenticação

Login em `/`. `AuthProvider` consulta `/auth/me`, disponibiliza perfil, systemRole, memberships, loading e erro. O layout `/super-admin` monta as páginas somente após confirmar `SUPER_ADMIN`. Usuários comuns recebem acesso não autorizado; ausência de sessão redireciona para `/`. O backend permanece a autoridade.

`lib/api.ts` centraliza todas as chamadas, força `credentials: include` e `cache: no-store`, preserva `NEXT_PUBLIC_API_URL` e o fallback `https://api.kalend.tech`. Para DEV, configurar `NEXT_PUBLIC_API_URL=https://api-dev.kalend.tech` no build. Não há tokens em JavaScript, storage, Authorization ou cookies criados pelo cliente.

401 permite uma renovação e uma repetição da chamada. Uma Promise compartilha a renovação na aba; Web Locks serializa entre abas; BroadcastChannel informa renovação, login e encerramento sem transmitir tokens ou perfil. Dentro do lock, `/auth/me` verifica se outra aba já renovou. Login/logout usam o mesmo lock. Falha encerra o estado local; segundo 401 não inicia outro refresh. Login/refresh/logout não renovam recursivamente. Sem Web Locks, exige novo login em vez de arriscar replay. Não há retries automáticos de rede, 429 ou 503.

Sair chama `/auth/logout` e limpa estado após sucesso. Falha é exibida e permite tentar novamente, sem fingir revogação no servidor. Abas recebem o encerramento; conteúdo e dados de página são desmontados. O perfil também é revalidado ao retornar à aba.

400/422, 401, 403, 404, 409, 429, 500 e 503 têm mensagens locais sanitizadas. 403 nunca tenta refresh. Não se exibem mensagens internas do Nest.

## Telas e contrato

- Dashboard: `/dashboard/summary`, contagens e receita do backend, carregamento, erro, vazio e atualização manual/ao retornar à aba. Sem MRR estimado ou receita de trials. Consulta novamente ao montar, inclusive ao voltar do cadastro.
- Empresas: lista e Nova empresa preservadas; cadastro `/companies/manual`, senha descartada após sucesso e retorno à lista, que consulta novamente. Assinatura ativa não é apresentada como empresa pagante.
- Planos: lista administrativa `/plans`, criação/edição existentes preservadas, campos documentados de trial/limites/mensal/anual. `/plans/public` permanece disponível no seletor de planos ativos. `trialDays=0` não é enviado ao desabilitar trial.
- Assinaturas: `/subscriptions`, campo legado `trialStartsAt`, estados documentados, sem cálculo de MRR. `INCOMPLETE` removido.
- Financeiro: `/finance` e `/finance/summary`; falhas, cancelados e estornados separados. Receita vem do backend.
- Usuários: `/users` e `/users/summary` usam o cliente autenticado.
- Pagamentos: `/super-admin/configuracoes/pagamentos`; `/super-admin/configuracoes` redireciona. Mercado Pago, Stripe e PagBank, ambiente, status, flags, identificação pública e última validação. Novos segredos são somente de escrita, descartados após tentativa de envio. Vazio preserva segredo no mesmo ambiente. Troca de ambiente exige ambas as novas credenciais e confirmação. Remoção via null não foi exposta na interface; usar provisionamento administrativo. Edição desativa integração conforme backend. Teste pode retornar 503; ativação bloqueada sem adapter.
- Webhooks: listagem existente, empresa, URLs derivadas da API, nova página `/super-admin/webhooks/[id]` com metadados e erro genérico. Sem payload bruto. Reprocessamento confirmado e disponível somente para FAILED com pagamento conhecido e adapter disponível; 409/503 tratados. Receptores externos nunca são chamados pelo frontend.

## Arquivos

Criados:
- `lib/contracts.ts`
- `components/auth-provider.tsx`
- `components/dashboard-summary.tsx`
- `components/admin-section.tsx`
- `app/super-admin/layout.tsx`
- `app/super-admin/configuracoes/page.tsx`
- `app/super-admin/configuracoes/pagamentos/page.tsx`
- `app/super-admin/webhooks/[id]/page.tsx`
- `tests/integration.test.cjs`
- `docs/FRONTEND-AUTH-INTEGRATION.md`

Alterados:
- `lib/api.ts`, `package.json`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/super-admin/page.tsx`
- `app/super-admin/empresas/page.tsx`, `app/super-admin/empresas/nova/page.tsx`
- `app/super-admin/planos/page.tsx`, `app/super-admin/planos/novo/page.tsx`, `app/super-admin/planos/[id]/page.tsx`
- `app/super-admin/assinaturas/page.tsx`, `app/super-admin/financeiro/page.tsx`
- `app/super-admin/usuarios/page.tsx`, `app/super-admin/webhooks/page.tsx`

## Validação e limites

`npm ci` concluído com Node 22.23.2. A instalação inicial com Node 18 emitiu alertas de engine e omitiu dependências nativas; foi refeita com Node compatível. `npm test`: 13 testes passando com transporte simulado e renderização React, incluindo formulário de login, login inválido, me, autorização, cookies, refresh concorrente em uma e duas instâncias de aba, falha/limite de retry, logout, dashboard, status HTTP e auditoria de secrets. `npm run lint`, TypeScript e build padrão Next passaram. O build precisou de execução fora do sandbox para a porta interna do Turbopack. A tentativa intermediária Webpack não passou antes da reinstalação; não é a validação final.

Não houve teste E2E em navegador nem autenticação real no DEV. Não foi verificada a empresa de teste no banco/API. Testes com locks simulados não substituem aceitação com múltiplas abas reais, HTTPS, CORS e cookies.

## Divergências e backend

A documentação diz que autenticação/migrations/bootstrap ainda não foram implantados no DEV, enquanto o pedido descreve autenticação já recebida pelo backend DEV. Nenhuma implantação foi presumida ou realizada. Também documenta adapters pendentes: testar gateway/reprocessar webhook não significa conexão real disponível.

Divergências antigas do frontend corrigidas: dashboard com zeros fixos, MRR calculado, assinatura ACTIVE tratada como pagante, plans/public na lista administrativa, trialStartedAt na listagem legada, INCOMPLETE inexistente, failedCount rotulado como falhas/cancelados e trialDays=0.

Não é necessária mudança de contrato/backend para esta integração. Para aceitação real, confirmar implantação, migrations, primeiro Super Admin, secrets de backend e origin `https://dev.kalend.tech` na allowlist. Localhost HTTP não é suportado pelos cookies Strict/Secure; usar frontend HTTPS do mesmo site. Adapters reais e demais pendências operacionais seguem fora do escopo. Nenhum arquivo do kalend-api foi alterado. Sem commit, push ou alteração de produção.
