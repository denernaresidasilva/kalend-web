> Atualização: o novo contrato comercial foi integrado. O relatório vigente é [phase-4.2-homologation.md](./phase-4.2-homologation.md). O texto abaixo registra a etapa anterior e seus bloqueios foram substituídos pelo novo relatório.

# Fase 4.2 — implementação e limites de produto

## Implementação

- Tokens semânticos Light/Dark e estilos compartilhados, limitados às áreas `.kalend-ui`.
- Preferência Claro/Escuro/Sistema em `kalend:theme`, sem cookies, tokens ou sessão. Bootstrap antes da pintura, acompanhamento do sistema e redução de movimento.
- Shell único no layout administrativo, mantendo os estados existentes de sessão, autorização e logout. Sidebar de 248px, recolhimento de 72px, tablet compacto e drawer modal mobile.
- Navegação completa em Sistema, Negócio, Comunicação e Configurações. Breadcrumb, perfil real, Minha conta, Pagamentos e Sair. Nenhum contador fictício.
- Dashboard reorganizado usando os contratos existentes. Nenhuma série histórica, MRR, ARR, churn, uptime ou percentual de crescimento foi acrescentado.
- Listagens usam a navegação central. Formulários e páginas comerciais mantêm suas consultas, validações e handlers.
- Configurações apresenta destinos reais: conta, aparência, pagamentos, webhooks, comunicação, Push/notificações e empresas. Segurança está explicitamente em preparação; edição de configuração da empresa não possui formulário disponível.
- `/planos`: LP pública, catálogo dinâmico, mensal/anual, destaque, recursos, limites, comparação responsiva, FAQ de regras conhecidas e CTAs.
- `/conta/planos`: escolha autenticada. `/conta/regularizar`: recuperação financeira. Ambas usam o `RegularizationPanel` e o fluxo existente de checkout.
- `PlanCatalog` é compartilhado entre LP e escolha autenticada. Economia anual deriva dos preços reais; preço zero não é anunciado como compra gratuita. `null` é apresentado como “Sem limite definido”, dado ausente como “Não informado”.

## Fontes verificadas, sem editar backend

- `../kalend-api/src/plans/plans.controller.ts`: `GET /plans/public` não usa AdminGuard.
- `../kalend-api/src/plans/plans.service.ts`: catálogo filtra `isActive: true`, `isPublic: true` e retorna preços, trial, destaque, badge, ordem, limites e recursos habilitados.
- `../kalend-api/src/billing/billing.module.ts`: `GET /billing/regularization` exige TenantGuard e papéis OWNER/ADMIN, com recuperação comercial.
- `../kalend-api/src/billing/regularization.service.ts`: estado e expiração são decididos pelo backend.
- `../kalend-api/src/billing/commercial-policy.ts`: acesso considera períodos e graça no backend.

A LP solicita o catálogo sem credenciais e sem cache, na entrada, ao recuperar foco e ao atualizar. Alterações administrativas aparecem nas consultas seguintes; não existe streaming/realtime no contrato atual. Disponibilidade anônima e CORS do ambiente publicado ainda precisam ser confirmados nesse ambiente.

## Login e destinos reais

A seleção de empresa e confirmação da sessão continuam existentes. Após essa confirmação:

| Papel | Destino normal existente | Consulta comercial |
|---|---|---|
| SUPER_ADMIN | `/super-admin` | Não se aplica à administração global |
| OWNER | `/conta`, temporário | `/billing/regularization` |
| ADMIN | `/conta`, temporário | `/billing/regularization` |
| PROFESSIONAL | `/conta`, temporário | Não autorizado pelo contrato atual |
| RECEPTIONIST | `/conta`, temporário | Não autorizado pelo contrato atual |
| CLIENT | `/conta`, temporário | Não autorizado pelo contrato atual |

Não há dashboards de proprietário, profissional, recepção/PDV ou cliente no App Router atual. Não há papel PDV no contrato `AuthMe`; RECEPTIONIST não foi renomeado ou presumido como PDV. Não foram criados dashboards fictícios.

Para gestores comerciais, a prioridade é:

1. `accessAllowed: false` com `reason: PAYMENT_REQUIRED` ou status `PAST_DUE`/`SUSPENDED`: `/conta/regularizar`. Checkout pendente isolado e carência com acesso permitido não bloqueiam.
2. `trialExpired` ou status `TRIAL_EXPIRED`: `/conta/planos`.
3. Estado normal: destino existente do papel.

O retorno da API precisa corresponder à empresa selecionada. Falha na consulta não é convertida em pendência fictícia. A conta verifica o estado comercial antes de montar a área de assinatura. As páginas de escolha/recuperação não redirecionam entre si, evitando loops. A conta e a seleção de empresa permanecem acessíveis como rotas de recuperação e suporte; não há dashboard tenant normal existente para bloquear.

## Bloqueios específicos que dependem de contrato/backend

### Aviso de trial em 3, 2 e 1 dias — não implementado

Contrato atual: `/billing/regularization` retorna `trialExpired`, `subscription.trialEndsAt` e `trialStartedAt`, mas não retorna referência de tempo do servidor, dias restantes ou timezone comercial. `AuthMe` também não oferece essas informações. Usar apenas Date.now do dispositivo não atende à regra de produto.

Alteração necessária, a definir no backend: fornecer `serverNow` e a semântica de cálculo/timezone, ou um campo calculado como `trialRemainingDays` em `/billing/regularization`. O frontend poderá então apresentar o aviso não bloqueante e os CTAs “Escolher plano” e “Continuar usando”, sem mudar autorização.

### Prioridade comercial para profissionais/recepção/clientes — não implementada

O endpoint de regularização é restrito a OWNER/ADMIN. `/auth/me` expõe papel, vínculo e status da empresa, mas não estado comercial suficientemente detalhado, expiração de trial ou motivo obrigatório de regularização. Status da empresa sozinho não comprova dívida.

Alteração necessária: um contrato de estado de acesso comercial, seguro para esses papéis, contendo decisão do backend (`accessAllowed`, motivo, trial expirado e destinatário autorizado da recuperação), sem dados de cobrança ou credenciais. Não ampliar autorização do endpoint de checkout.

### Pagamento recusado/fatura atrasada individual

O contrato de regularização informa decisão agregada e pagamento pendente, mas não detalha última recusa/fatura. O frontend usa `PAYMENT_REQUIRED`/estado comercial; não infere dívida de um pagamento histórico falho. Se o produto precisar de motivos distintos, o backend deve retornar uma razão obrigatória inequívoca, com o estado de acesso correspondente.

### Dashboards por papel

Dependem da implementação dos painéis futuros. As rotas temporárias estão explicitamente mapeadas, sem rotas inventadas.

## Preservação

Não foram modificados backend, Prisma, banco, estrutura de autenticação, cookies, tokens, transporte da API, credenciais, PagBank, service worker, manifesto, providers de PWA/Push ou lógica de seleção de empresa. A função de destino normal recebeu somente o mapa explícito dos papéis para as rotas existentes.

As alterações nos testes antigos mantêm as verificações de comportamento e segurança. A única exceção à proibição de armazenamento é o módulo de tema e seu provider; os demais módulos continuam sem armazenamento de sessão no navegador.

## Validação

Os comandos e resultados finais, a verificação de browser e a lista de arquivos estão registrados ao final deste documento. Testes de navegador usam fixtures isoladas, sem tráfego ao backend real. Fixtures não fazem parte do catálogo ou dos dados da aplicação.

## Arquivos modificados

- `app/conta/page.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `app/super-admin/assinaturas/page.tsx`
- `app/super-admin/configuracoes/page.tsx`
- `app/super-admin/empresas/nova/page.tsx`
- `app/super-admin/empresas/page.tsx`
- `app/super-admin/financeiro/page.tsx`
- `app/super-admin/layout.tsx`
- `app/super-admin/page.tsx`
- `app/super-admin/planos/[id]/page.tsx`
- `app/super-admin/planos/novo/page.tsx`
- `app/super-admin/planos/page.tsx`
- `app/super-admin/usuarios/page.tsx`
- `app/super-admin/webhooks/page.tsx`
- `components/admin-section.tsx`
- `components/dashboard-operations.tsx`
- `components/dashboard-summary.tsx`
- `components/gateway-cards.tsx`
- `components/regularization-panel.tsx`
- `lib/company-selection.ts`
- `tests/company-selection.test.cjs`
- `tests/integration.test.cjs`

## Arquivos criados

- `app/conta/planos/page.tsx`
- `app/conta/regularizar/page.tsx`
- `app/planos/page.tsx`
- `app/styles/kalend-components.css`
- `app/styles/kalend-plans.css`
- `app/styles/kalend-tokens.css`
- `app/styles/super-admin-shell.css`
- `components/commercial-entry.tsx`
- `components/plans/billing-page.tsx`
- `components/plans/plan-catalog.tsx`
- `components/plans/plan-faq.tsx`
- `components/plans/public-plans.tsx`
- `components/super-admin/admin-shell.tsx`
- `components/super-admin/header.tsx`
- `components/super-admin/navigation.ts`
- `components/super-admin/sidebar.tsx`
- `components/theme/theme-control.tsx`
- `components/theme/theme-provider.tsx`
- `components/ui/alert.tsx`
- `components/ui/badge.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/drawer.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/icon-button.tsx`
- `components/ui/loading.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/page-header.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/tooltip.tsx`
- `docs/phase-4.2.md`
- `lib/commercial-navigation.ts`
- `lib/drawer.ts`
- `lib/plan-presentation.ts`
- `lib/theme.ts`
- `tests/design-system.browser.cjs`
- `tests/design-system.test.cjs`

## Resultados finais

- `npm test`: cinco suítes passaram em Node 22.23.2. A suíte nova contém 12 testes de comportamento.
- `npm run lint`: passou, sem erros ou avisos.
- `git diff --check`: passou.
- Chrome headless: 306 combinações Super Admin/LP + 54 combinações de conta/escolha/recuperação, totalizando 360 verificações em Light/Dark nas larguras 320, 375, 390, 430, 768, 1024, 1280, 1440 e 1920px. Nenhum overflow horizontal da página ou exceção JavaScript nos cenários testados.
- Interações de navegador passaram: Escape, scroll bloqueado, foco de retorno, persistência após reload, mudanças do tema do sistema, seleção de plano, mensal/anual, redirecionamento de trial expirado e prioridade financeira.
- As tabelas mantêm scroll local. Essa validação não representa certificação completa de acessibilidade ou teste de todas as variantes de dados reais.
- `npm run build` no Node padrão 18.19.0: bloqueado pelo requisito mínimo >=20.9 do Next.js.
- `npm run build` em Node 22, inclusive na tentativa escalada: Turbopack falhou ao abrir porta interna durante processamento CSS, com `Operation not permitted (os error 1)`. Log final: `/tmp/next-panic-b64d90e535e12fdff74c6ca87fe28453.log`.
- `npm run build -- --webpack` em Node 22, executado com permissão fora do sandbox: passou, incluindo compilação, TypeScript e geração das 21 páginas estáticas. Nenhuma mudança de configuração ou dependência foi necessária.
- O build final foi gerado sem `NEXT_PUBLIC_API_URL` de teste. O ambiente original não define essa variável; a conexão real depende da configuração do ambiente. Não houve validação de cobrança ou dados de produção.
- Git: 23 arquivos existentes modificados e 38 arquivos novos, sem staging, commit, push ou deploy. `git diff --stat` mostra apenas os arquivos já rastreados; os novos permanecem untracked.

### Reproduzir a validação de navegador

Usar Node 22 e Chrome instalado. Os testes não acessam o backend e não executam cobranças reais:

```bash
NEXT_PUBLIC_API_URL=https://api.kalend.invalid npm run build -- --webpack
node tests/design-system.browser.cjs
node tests/design-system.browser.cjs --owner
npm run build -- --webpack
```

O último comando restaura o build sem o endereço reservado aos testes. O harness usa um perfil isolado em `/tmp`, inicia apenas servidor local e Chrome headless e encerra esses processos ao concluir. Resultados ficam em `/tmp/kalend-phase42-responsive.json` e `/tmp/kalend-phase42-owner-responsive.json`.
