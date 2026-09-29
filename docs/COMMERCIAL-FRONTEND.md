# Fase 1 comercial — frontend DEV

Escopo desta interface: repositório `kalend-web`, branch `develop`. A implementação consome os contratos documentados na revisão comercial da API. O frontend não consulta ambiente remoto durante build/teste e não altera o repositório `kalend-api`.

## Contratos usados

- `GET /payment-gateways` e `GET /payment-gateways/:gateway`, `PATCH /payment-gateways/:gateway`, `POST /payment-gateways/:gateway/test` para MERCADO_PAGO, STRIPE, PAGBANK e ASAAS. A resposta traz environment, configured, webhookConfigured, status, adapterAvailable, capabilities, recurringConfigured, webhookStatus e webhookUrl/path. PAGBANK aceita `recurringCredentials`/`recurringEnabled`; não aceita novo `webhookSecret`. ASAAS exige segredo próprio de webhook diferente da API key.
- `GET /plans`, `GET /plans/:id`, `POST /plans`, `PATCH /plans/:id` usam campos de preço, trial, visibilidade, ordem, limites e features que a validação da API documenta. `maxMessages` e `isPublic` foram acrescentados pela Fase 1.
- `GET /subscriptions`, `GET /subscriptions/:id`, `GET /finance`, `GET /finance/summary` mantêm os contratos documentados. O detalhe da assinatura permite mostrar snapshot de estornos parciais, ambiente, períodos e ciclo de cada pagamento. O resumo de receita do backend desconta `refundedAmountCents` e conta só pagamentos aprovados.
- `GET /dashboard/summary` e `GET /webhooks/summary` fornecem as métricas mostradas no Dashboard. Webhooks recentes continuam usando `GET /webhooks`/`GET /webhooks/:id`.
- A regularização usa `GET /auth/me`, `POST /auth/tenant`, `GET /billing/regularization`, `POST /billing/checkout` e `POST /billing/subscriptions/:id/cancel`. Checkout envia apenas `planId`, `billingInterval`, `gateway`, `idempotencyKey`, `recurring` e `taxId` quando o gateway é ASAAS. O API decide empresa, preço, ambiente, estado e efeito do pagamento.
- O limite global reconhece o 403 estruturado `PLAN_LIMIT_REACHED` (`feature`, `current`, `limit`, `upgradeRequired`). Também apresenta `PLAN_FEATURE_UNAVAILABLE` e `SUBSCRIPTION_REQUIRED` quando retornados.
- Reconciliação administrativa manual usa `POST /billing/reconcile`, com confirmação e retorno tipado documentado: `expired`, `reconciledAt`, `paymentsChecked`, `paymentsFailed`, `batchLimit`.

## Provedores e limites conhecidos

Todos os quatro têm card e configuração individual. Secrets são inputs vazios de escrita única e são limpos após a tentativa. A configuração retornada não preenche os campos. Um PATCH omite segredo vazio no mesmo ambiente; alteração de ambiente exige substituições e confirmação. O backend impede mudança de ambiente com histórico financeiro. Webhook usa o URL HTTPS retornado pela API ou o path seguro combinado com a base pública configurada. Credencial armazenada, conectividade, validação de conta, webhook verificado e homologação são estados separados.

PagBank pode retornar conectividade `CONNECTED` e checks de credencial, chave de webhook, recorrência e reconciliação. A interface explica `UNVERIFIED` e `RECONCILIATION_UNVERIFIED` e preserva o texto de limitação retornado. O backend registra reconciliação de checkout/faturas e cancelamento no fim do período como limitações. Asaas não dispara configuração automática de webhook durante o teste.

Checkout URL só é mostrado quando `creationState=CREATED` e o endereço é HTTPS sem usuário/senha. Estados `READY`, `CREATING` e `UNCERTAIN` bloqueiam outra compra e pedem atualização/reconciliação. Retorno do provedor nunca concede acesso.

## Contratos ainda não disponíveis

A listagem `GET /finance` não traz `environment`, `periodStart`, `periodEnd` ou `refundedAmountCents`; os valores individuais e intervalos de refund aparecem no detalhe de assinatura, quando há vínculo. Pagamentos sem assinatura não têm esses detalhes nesta interface. Para mostrar esses campos diretamente na tabela financeira, o contrato de `GET /finance` precisa expô-los.

`GET /subscriptions` não traz `gateway`, `environment`, `graceEndsAt`, `cancellationRequestedAt` nem `cancelAtPeriodEnd`; o detalhe `GET /subscriptions/:id` traz esses campos e a interface o consulta sob demanda. O resumo do Dashboard não conta assinaturas em graça. Nenhuma definição de conversão, MRR, gateways agregados por status ou contagem de webhooks reprocessados foi comprovada; tais números não são calculados.

O endpoint de regularização não retorna capabilities do gateway da assinatura atual para decidir cancelamento ao fim do período. A tela oferece somente cancelamento imediato, confirmado, suportado pelo endpoint. Troca de plano durante assinatura paga vigente/prorrata segue bloqueada pelas regras documentadas da API.

O contrato de Plan não contém campo separado para título comercial ou lista de benefícios; a interface usa `name`, `description`, `badge` e `features` comprovados pela API.

As capabilities do provider não indicam homologação de Sandbox. O frontend preserva limitações textuais/`checks` retornados e não declara um gateway operacional com base apenas em configuração.

## Segurança e operação

`NEXT_PUBLIC_API_URL` continua como base de todas as chamadas e não tem fallback de produção. A base DEV deve ser definida no ambiente de build. Transporte autenticado conserva `credentials: include` e `cache: no-store`; não armazena token, secret, API key, JWT ou credencial em storage do browser. 401 mantém a rotação única já existente; 403 não faz refresh.

As páginas da área comercial do cliente preservam a sessão em empresas suspensas: o contexto de empresa é escolhido via `/auth/tenant`, e a identidade/empresa selecionada é validada via `/auth/me` antes de chamar rotas comerciais. OWNER/ADMIN vê regularização; outros membros recebem orientação para falar com o responsável.

## Aceitação pendente em Sandbox

A validação deste workspace não acessou a API DEV, contas, credenciais, banco, produção ou frontend publicado. Após o provisionamento e a migração do backend DEV, validar em HTTPS e com contas Sandbox: cookies/CORS/Origin, conexão de cada gateway, entrega real de webhook, checkout e retorno, reconciliação, recorrência em dois ciclos, cancelamento, refund parcial/total, repetição de webhooks, trial Premium seguido de Pro e concorrência em PostgreSQL. A reconciliação e PagBank checkout/faturas continuam explicitamente não homologados pela auditoria da API.
