# Fase 2 — Comunicação Global do Kalend — relatório de revisão

Implementação local em 29/09/2026. Escopo exclusivo: **Kalend → proprietários das empresas**. O módulo não contém comunicação empresa/salão → clientes nem usa contexto tenant. Sem commit, push, deploy, migração ou acesso à produção. Backend não modificado.

## 1. Branch atual

`kalend-web`: `develop`, base `eb7100a` (Interface comercial da Fase 1). O backend local também está em `develop`, base `88c979e` (Comunicação global da Fase 2). Ambos estavam limpos antes da implementação.

## 2. Git status

Alterações locais, todas desta implementação. Nenhum arquivo staged. Estado ao concluir: 12 arquivos rastreados modificados e 12 arquivos novos (a pasta da rota aparece agrupada no `git status --short`). As listas completas estão nos itens 3 e 4.

## 3. Arquivos criados

- `app/super-admin/comunicacao/page.tsx`
- `components/communication-page.tsx`
- `components/communication-resource.tsx`
- `components/communication-operations.tsx`
- `components/communication-overview.tsx`
- `components/communication-providers.tsx`
- `components/communication-templates.tsx`
- `components/communication-meta.tsx`
- `components/communication-records.tsx`
- `lib/communication.ts`
- `tests/communication.test.cjs`
- `docs/COMMUNICATION-FRONTEND.md`

## 4. Arquivos modificados

- `README.md`: link para este relatório.
- `app/globals.css`: estilos responsivos específicos da comunicação, preservando os componentes comerciais.
- `app/super-admin/layout.tsx`: navegação móvel/global.
- `app/super-admin/page.tsx`: menu do dashboard.
- `app/super-admin/empresas/page.tsx`
- `app/super-admin/planos/page.tsx`
- `app/super-admin/assinaturas/page.tsx`
- `app/super-admin/financeiro/page.tsx`
- `app/super-admin/usuarios/page.tsx`
- `app/super-admin/webhooks/page.tsx`: estas seis páginas receberam apenas o item Comunicação em seus menus existentes e o import do ícone.
- `components/admin-section.tsx`: menu compartilhado.
- `package.json`: `npm test` executa todos os arquivos `tests/*.test.cjs`. Dependências e lockfile preservados.

## 5. Arquitetura implementada

Uma rota com nove seções internas, montadas sob demanda. Reutiliza `AdminSection`, `AuthProvider`, `isSuperAdmin`, `lib/api.ts`, cookies autenticados, refresh coordenado, erros sanitizados, componentes/classes comerciais da Fase 1 e formatação existente de datas. Não há novo mecanismo de autenticação.

`lib/communication.ts` centraliza contratos e chamadas. O hook de leitura cancela requisições anteriores e ignora respostas após desmontagem. As mutações usam trava síncrona e estado de loading; a navegação interna e a troca de evento/canal ficam bloqueadas enquanto uma mutação está pendente. Feedback é exibido em português com `role=status`/`role=alert`, seguindo o padrão inline existente, sem nova biblioteca de toast.

A visão geral carrega provedores, outbox, entregas e falhas independentemente: erro em uma consulta não transforma seu card em zero nem esconde as outras respostas. As contagens operacionais são explicitamente contagens dos registros retornados, sem supostos totais.

## 6. Páginas/rotas criadas

`/super-admin/comunicacao`, com Visão geral, Canais, Templates internos, Eventos, Meta Templates, Fila / Outbox, Entregas, Falhas e Logs. Nenhuma rota administrativa para webhook.

## 7. Endpoints utilizados

| Método | Endpoint | Uso |
| --- | --- | --- |
| GET | `/communication/providers` | Estado/configuração pública dos canais |
| PATCH | `/communication/providers/:provider` | Configuração e habilitação/desabilitação |
| POST | `/communication/providers/:provider/test` | Verificação de conexão |
| POST | `/communication/providers/:provider/send-test` | Teste ao administrador autenticado |
| POST | `/communication/providers/EVOLUTION/pair` | QR de pareamento real |
| GET | `/communication/events` | Catálogo e variáveis permitidas |
| GET | `/communication/templates` | Políticas/templates internos |
| PATCH | `/communication/templates/:event/:channel` | Salvar template/política global |
| GET | `/communication/meta/templates` | Templates oficiais sincronizados |
| POST | `/communication/meta/templates/sync` | Sincronização de página Meta |
| POST | `/communication/meta/templates` | Submissão de template oficial |
| GET | `/communication/outbox` | Eventos recentes na fila |
| GET | `/communication/deliveries` | Entregas recentes |
| GET | `/communication/failures` | FAILED, UNSENDABLE e UNCERTAIN |
| GET | `/communication/logs` | Logs recentes |
| POST | `/communication/deliveries/:id/reprocess` | Antecipar retry seguro |

Não são chamados endpoints `/webhooks/communication/meta` pelo frontend administrativo.

## 8. Contratos/payloads confirmados no backend

Fontes locais: `kalend-api/src/communication/communication.module.ts`, `configuration.ts`, `contracts.ts`, `engine.ts`, `meta.ts`, `transports.ts`, schema Prisma, guard administrativo e testes de configuração, engine, segurança, Meta management e webhook HTTP. As instruções e guias locais de páginas/layouts, componentes server/client e CLI da versão instalada do Next foram consultados.

- Providers GET retorna **array** com `provider`, `scope`, `environment`, `enabled`, `config`, `configured`, `status`, `revision`, `lastVerifiedAt`, `lastSentAt`, `lastError`, `adapterAvailable`. `configured` indica existência de credencial criptografada, não completude de todos os secrets nem conexão.
- PATCH provider: `{ config, environment, secrets? }`; habilitação separada: `{ enabled }`. Ambientes: SANDBOX/PRODUCTION. `config` contém valores **string**, inclusive SMTP `port` e `secure`; não se enviam number/boolean nestes dois campos. Secrets vazios são omitidos. O backend aceita também remoção explícita por null, mas a interface implementa substituição/preservação, sem ação de remoção.
- SMTP config: `host`, `port`, `secure`, `username`, `fromName`, `fromEmail`, `replyTo` opcional, omitido quando vazio (o backend rejeita string vazia); secret `password`. Combinações suportadas: `465`/`true` e `587`/`false`. `smtp.gmail.com` proibido.
- META config: `phoneNumberId`, `businessAccountId`, `graphVersion`; secrets `accessToken`, `appSecret`, `verifyToken`. A versão Graph deve coincidir com a variável autorizada no backend, sem versão inventada pelo frontend.
- EVOLUTION config: `baseUrl`, `instance`, `version`; secret `apiKey`. Versão aceita atualmente: `2.3.7`. Validação de URL, allowlist e segurança permanece no backend.
- POST test sem payload: `{ connected, sendTested: false }`. PATCH com alterações invalida/desabilita a integração; habilitação exige CONNECTED e adapter disponível.
- POST send-test SMTP/Evolution: `{}`. Meta: `{ template: { id, name, language, parameters: [] } }`, com referência sincronizada aprovada de BODY estático. O backend escolhe e-mail/telefone do administrador, não aceita destinatário fornecido. Resposta: `{ accepted: true, delivered: false }`.
- POST pair: `{ connected: true }` quando a instância já está conectada, ou `{ connected: false, qrCode }`, sendo `qrCode` PNG em data URI validado pelo backend. Ambos os retornos são tratados; o teste separado valida o provider no Kalend.
- Events GET: array de `{ event, variables }`. Não há lista fechada de eventos ou variáveis codificada como fonte de verdade no frontend.
- Template PATCH: `{ provider, enabled, content }`. EMAIL: `{ subject, text }`; EVOLUTION WHATSAPP: `{ text }`; PUSH: `{ title, text }`; META WHATSAPP: `{ id, name, language, parameters: string[] }` com nomes de variáveis do evento. O GET persiste referências Meta como `metaId`, `metaName`, `metaLanguage`, `metaParameters` (JSON serializado); a UI converte de volta ao payload de escrita correto.
- Meta sync: `{}` ou `{ after }`; resposta `{ synced, after: string | null }`. O cursor é usado somente no body, não como URL de navegação. Uma página por ação, sem baixar milhares de templates automaticamente.
- Meta create: `{ name, language, category: 'UTILITY', text }`; corpo estático de até 1024 caracteres, sem variáveis. Resposta `{ externalId, syncRequired: true }`. Não se enviam componentes arbitrários ou status de aprovação.
- Outbox, deliveries, failures, logs e templates GET: arrays limitados a 100, **sem totais, filtros ou paginação**. Meta GET também lista até 100 templates locais da conta/ambiente atual.
- Delivery não contém evento. A UI mostra `outboxId` para correlação, sem supor que um registro ausente no recorte seja inexistente. Outbox não possui canal, destinatário, status de entrega ou tentativas: esses campos não são inventados.
- Reprocess não recebe body; resposta `{ queued: true }`. O servidor só aceita status RETRY, attempts < 5 e payload criptografado ainda disponível. O frontend verifica os dois campos públicos; o servidor decide a elegibilidade completa e pode responder 409.

## 9. Tratamento de secrets

Inputs de senha iniciam vazios, sem recuperar secrets salvos. Somente campos secretos permitidos são enviados no body de PATCH. Valores vazios não sobrescrevem credenciais. Os inputs são não controlados: secrets digitados não entram em estado React nem em props. São lidos do DOM somente na submissão, mantidos em variáveis locais para montar o body e limpos antes de aguardar a requisição; valores da resposta nunca os preenchem. O estado React registra somente um booleano de presença de edição. Sem storage do navegador, console, analytics, query string, logs ou tokens em URLs. Erros da API não exibem o corpo bruto retornado pelo backend.

## 10. Funcionamento SMTP

Formulário com campos confirmados, seleção conjunta porta/TLS, preservação/substituição da senha, salvar, testar conexão, enviar teste para o próprio administrador e habilitar/desabilitar após validação. Não é mostrado fluxo de senha de aplicativo Gmail.

## 11. Funcionamento Meta

Configuração write-only, teste, envio com template oficial aprovado e sem parâmetros, habilitação separada e área específica de templates Meta. Configurar não comprova conexão; testar não comprova entrega/homologação. Nenhum editor de webhook.

## 12. Funcionamento Evolution

Configuração write-only, teste, envio ao administrador, pareamento e repetição da solicitação de QR. Apenas PNG data URI retornado pela API é renderizado; URLs externas/SVG são recusados. QR em memória, ocultável, descartado ao editar campos ou sair da seção. Pareamento não muda o status para conectado nem entregue.

## 13. Funcionamento Gmail

Card “Em breve · OAuth ainda não configurado”. Não existe botão falso de conexão, formulário OAuth ou envio funcional. Templates de e-mail vinculados a Gmail podem existir como rascunhos inativos; a interface impede ativação.

## 14. Funcionamento Push

Card “Em breve”, sem tokens e sem Firebase/OneSignal. Templates PUSH podem ser salvos como rascunhos inativos, conforme contrato, sem apresentar o provider como funcional.

## 15. Templates internos

Seleção de evento fornecido pela API, canal e provider; assunto/título/conteúdo conforme canal; ativo/inativo quando adapter disponível; variáveis reais; prévia ilustrativa em texto. Nenhum HTML administrativo é executado: React escapa a prévia e o backend gera HTML de e-mail escapando texto. Templates Meta internos referenciam os oficiais e mantêm parâmetros ordenados, sem confundir gestão de aprovação.

## 16. Meta Templates

Lista local de nome, idioma, categoria, status real, sincronização e corpo seguro. Sincronização desde início e por cursor da próxima página. Criação limitada ao contrato UTILITY estático, com confirmação; pede sincronização após submissão ou resultado incerto e bloqueia nova criação até concluir todas as páginas de sincronização e atualizar a lista com sucesso. O bloqueio permanece ao sair e voltar à seção nesta página. Nunca atribui APPROVED localmente.

## 17. Outbox

Tabela com ID, evento, criação, expansão e código de erro sanitizado. Não renderiza variables, businessKey, companyId ou userId. Sem métricas totais inventadas ou paginação fictícia.

## 18. Deliveries

Tabela com ID, outboxId, canal, provider, ambiente, destinatário mascarado, status real, tentativas, datas relevantes e erro sanitizado. Reprocessamento só oferecido para RETRY com menos de cinco tentativas, confirmado, com trava contra clique repetido, loading e atualização posterior. O feedback é mantido acima da tabela durante sua atualização. O backend pode recusar estados que já mudaram.

## 19. Failures

Consulta própria da API, estados FAILED/UNSENDABLE/UNCERTAIN, com dados de diagnóstico públicos e destinatário mascarado. Sem reprocessamento de resultado incerto, sem headers e sem payload criptografado.

## 20. Logs

Exibição de data, ação, código, tentativa, deliveryId e outboxId. Não expõe actorId nem objetos de request/response. Preserva a minimização já feita no backend.

## 21. Autorização Super Admin

Mantido guard do layout, que não monta crianças para contas comuns, sessão pendente ou não autenticada. O conteúdo da própria comunicação também verifica `isSuperAdmin` antes de montar qualquer seção ou iniciar leituras. O backend usa `AdminGuard` em todo o controller communication. 401 segue o refresh existente; 403 não concede acesso nem dispara refresh indevido.

## 22. Responsividade

Mesma tipografia, paleta, cards, inputs, botões, badges e sidebar existentes. Formulários usam duas colunas em desktop e uma até 760px; navegação e ações quebram linhas; QR limitado à largura disponível. Tabelas ficam em regiões de rolagem horizontal local, focáveis e nomeadas, sem expandir a largura da página. A navegação de sessão existente oferece acesso móvel quando a sidebar está oculta.

Na revisão rigorosa, Chrome headless mediu fixtures estáticas dos componentes reais usando o CSS compilado, em viewports de 320, 390, 768 e 1440px. A largura da página ficou limitada ao viewport; a tabela de 1480px rolou apenas no container local; formulário usou uma coluna em 320/390px e duas em 768/1440px. Os artefatos deste diagnóstico ficaram somente em /tmp. Isto não substitui homologação interativa em navegador com sessão/API ou teste em aparelho real. Não foram instaladas dependências de navegador.

## 23. Testes adicionados

26 testes em `tests/communication.test.cjs`, com requisições isoladas de teste e renderização React/handlers reais, sem mocks incorporados ao código de produção:

- Endpoints e payloads globais exatos, incluindo strings SMTP, send-test e cursor Meta.
- Providers pendente/conectado/falha e indisponibilidade Gmail/Push.
- SMTP write-only, troca/limpeza de senha mesmo após erro e proteção contra double-submit.
- Conexão distinta de envio/entrega e ativação condicionada.
- Meta write-only e seleção de referência oficial para teste.
- Evolution QR real em memória, rejeição de origem/formato inseguros e ocultação.
- Templates: payloads texto e referências Meta, variáveis reais e preview escapado.
- Catálogo dinâmico de eventos e ausência de eventos.
- Templates Gmail/Push sem ativação indevida.
- Criação Meta UTILITY, aprovação não simulada e cursor de sincronização.
- Retry confirmado, atualizado, sem duplicação e sem UNCERTAIN/FAILED/ACCEPTED/DELIVERED.
- Outbox, entregas, falhas e logs com registros reais, vazio e omissão de campos sensíveis.
- Loading, erro, retry e cancelamento das leituras.
- Bloqueio do conteúdo para não Super Admin.
- Visão geral com recortes identificados e falhas independentes.
- HTTP 401/403/404/409/422/429/500/503 e rede com mensagens sanitizadas.
- Navegação bloqueada durante mutações e confirmação para descartar edição.
- Auditoria de storage, HTML, URLs de QR e regras de CSS mobile.
- Evolution já conectada, sem QR, sem validação/entrega fictícia.
- Secrets de SMTP/Meta/Evolution ausentes do estado React e limpos antes da requisição.
- Bloqueio de submissão Meta preservado ao remontar a seção, com paginação e falha da atualização.
- Botão de retry de leitura explicitamente não submete formulários.
- Payloads do frontend executados nos validadores reais do backend local, incluindo replyTo vazio.
- Ambas as respostas do transport Evolution real consumidas pelo handler frontend.

Os dois últimos testes usam o backend local quando disponível; neste workspace ambos foram executados e passaram, sem skip. Fora de um checkout com kalend-api ao lado, esses dois testes são explicitamente marcados como skip. Mocks nestes testes se limitam à injeção de dependências e transporte externo; validação e geração das respostas são do código real.

## 24. Resultado de todos os testes

`npm test`: passou nas duas suítes. Execução individual confirmou **26/26 de Comunicação + 29/29 existentes = 55/55**, sem falhas, cancelamentos ou skips. A suíte da Fase 1 permaneceu inalterada e passou.

## 25. Resultado do lint

`npm run lint`: passou, sem erros ou warnings. Sem upgrade ou enfraquecimento das regras.

## 26. Resultado do TypeScript

`npx tsc --noEmit`: passou. TypeScript integrado ao build também passou.

## 27. Resultado do build

Runtime padrão inicial Node 18.19.0 é incompatível com o Next instalado. Foi usado **Node 22.23.2 já disponível localmente**, conforme orientação preexistente da Fase 1; nenhum runtime/dependência foi instalado.

`npm run build` com Node 22 não concluiu neste ambiente: inicialmente houve falha de acesso às fontes Google; após permissão ampliada, o Turbopack falhou ao criar uma porta para o processo de CSS (`Operation not permitted`). A revisão final repetiu o build padrão após as correções, com Node 22, e confirmou exatamente a restrição abaixo:

```text
Failed to write app endpoint /page
Caused by:
- [project]/app/globals.css [app-client] (css)
- creating new process
- binding to a port
- Operation not permitted (os error 1)
```

Foi extraída uma cópia limpa de `HEAD` (`eb7100a`, somente Fase 1) em `/tmp/kalend-web-phase2-baseline-review`, com as mesmas versões instaladas e o mesmo runtime. `npm run build` nessa cópia também reproduziu exatamente a cadeia acima, sem qualquer arquivo da Comunicação. Os logs de panic da cópia original (`/tmp/next-panic-60b58aae9bd3f731b722de2230df14a1.log`) e da implementação corrigida (`/tmp/next-panic-422ef806fb8aa175056d961cbe6138f9.log`) comprovam a mesma operação bloqueada. Isso exclui as alterações da Fase 2 como causa da restrição. Fontes Google também exigiram execução com permissão de rede; esse uso já existia em `app/layout.tsx`, que não foi modificado.

`npm run build -- --webpack`, opção suportada pelo CLI Next instalado: **passou**, incluindo compilação, TypeScript, geração estática e traces. A rota `/super-admin/comunicacao` aparece no resultado. O script padrão e a configuração do bundler não foram alterados. Esse build não chamou a API ou providers.

## 28. Resultado do git diff --check

Passou. Nenhum commit ou push realizado. Backend local continua limpo.

## 29. Limitações reais ainda existentes

- Listas limitadas a 100 registros sem filtro, paginação ou total; dashboard apresenta recortes, não agregações globais.
- Entregas não trazem o evento, somente outboxId; correlação depende dos registros disponíveis.
- Meta local lista até 100; a sincronização percorre páginas sob ação do operador, sem fingir que a lista local mostra todas.
- Gmail OAuth e Push continuam indisponíveis no backend.
- Evolution não possui confirmação completa de delivery. ACCEPTED permanece distinto de DELIVERED/READ.
- Criação Meta somente UTILITY estático BODY; sem componentes avançados ou variáveis na submissão oficial.
- configured é existência de credencial criptografada, não indicador por secret; a UI não pode dizer quais secrets individuais já estão preenchidos.
- Não há editor de HTML nem envio manual a destinatário arbitrário no contrato.
- Medição responsiva em navegador realizada somente com fixtures estáticas locais; interação autenticada, integração HTTP com backend em execução e aparelho físico não homologados.
- Build padrão Turbopack bloqueado neste ambiente; build alternativo Webpack validado. Nenhuma alteração de infraestrutura para contornar o bloqueio.

## 30. Dependências de homologação com providers reais

Homologar em ambiente autorizado: SMTP/allowlist/TLS e aceitação real; conta/número/versão Graph Meta, secrets do webhook, aprovação e receipts; Evolution allowlist HTTPS, versão 2.3.7, QR, pareamento e aceitação; destinatário do administrador com telefone válido; cookies/CORS/autorização em navegador; worker/scheduler e PostgreSQL, retry/backoff, idempotência e webhook Meta assinado. Não foram acionados providers reais, API remota, produção ou banco.

A segunda revisão conferiu endpoints, payloads, types, strings SMTP, secrets, autorização, escopo GLOBAL, status comprovados, templates distintos, limites das listas, cancelamento de leitura, double-submit, preview escapado, minimização de dados e menus. Foram corrigidos persistência do feedback de reprocessamento, bloqueio da navegação durante mutações, descarte do QR ao editar configuração, compatibilidade das chaves href/path nos menus existentes e exportação da página conforme Next. Sem TODO crítico ou mock no código de produção.

## Revisão rigorosa posterior à implementação

Todos os 24 arquivos do conjunto foram lidos/revisados, incluindo os não rastreados (que não aparecem no diff padrão). Bugs corrigidos nesta revisão:

1. SMTP enviava replyTo vazio, incompatível com o validador real: agora omite o campo opcional.
2. Evolution desconsiderava `{ connected: true }` sem QR: corrigidos union type e handler.
3. Secrets digitados estavam em estado React: transferidos para inputs não controlados, com leitura local só na submissão e limpeza imediata.
4. Retry de leitura dentro do formulário podia causar submissão: botão recebeu type=button.
5. Submissão Meta podia ser liberada após sync parcial/falha de reload ou remontagem da seção: guard preservado no contexto da página e liberado somente com sync completo e reload bem sucedido.

Sem novos endpoints, funcionalidades, dependências, configuração de produção ou alteração do bundler padrão. Não foram encontrados arquivos de debug, console, TODO/FIXME crítico ou artefatos temporários destinados ao commit. A documentação é o relatório exigido na implementação inicial e foi atualizada com estas evidências.

**APROVADO PARA COMMIT**
