# Escopo comprovado e limites da suíte

Esta entrega cria uma base oficial de homologação e o processo de aprovação. **Não automatiza todos os 132 cenários documentados.** A cobertura automatizada nova inclui 21 casos locais de browser (63 execuções nos três projetos), nove casos reais condicionais (27 execuções: 12 passaram e 15 skipped), integração SQL/HTTP e restart em processos descartáveis. Os testes API/Web já existentes são preservados e executados como camadas próprias.

## Resultado desta execução

- API: 692 testes unitários, 128 HTTP E2E; muitos usam persistência/provider mock.
- Integração: 42 asserções SQL/HTTP com migrations existentes em PGlite; gateway mock.
- Restart: 10 asserções em dois processos Node com PGlite persistido em disco. Trial, assinatura, evento/outbox e retry persistem; SENDING antigo fica UNCERTAIN. Não prova recuperação de envio externo cujo aceite ficou ambíguo.
- Web: 374 testes existentes em 16 arquivos; Playwright local 63/63; framework da homologação 13/13.
- DEV público: health, formulário de login, catálogo e proteção API anônima — quatro casos repetidos em desktop/tablet/mobile, 12/12.
- DEV autenticado: cinco casos condicionais repetidos nos três projetos ficaram skipped/NÃO TESTADO. Nenhuma empresa DEV foi criada e nenhum checkout remoto foi solicitado.
- Matriz: 132 cenários; 36 PASSOU em camada local/integração, um FALHOU por incidente DEV aberto e 95 NÃO TESTADO na camada exigida por cada linha. Um caso browser pode cobrir vários requisitos; a contagem de requisitos não é contagem de execuções.

O cenário granted local passou com a permissão do contexto Chrome correto e APIs simuladas. O incidente do usuário em DEV **continua FALHOU**: conta/perfil afetados não foram disponibilizados e não houve prova de encerramento. Permissão não comprova SW/subscription/dispositivo cadastrado/entrega. Não há correção Push nesta entrega.

## O que ainda exige recursos e trabalho

Contas QA de Super Admin/OWNER, tenant A/B e fixture QA expirada; domínio de e-mail controlado; gateway sandbox/webhook QA; SMTP sandbox com caixa consultável; instância WhatsApp QA e aparelho destinatário; dispositivo/PWA Push. Falhas reais de provider, pagamentos fora de ordem, múltiplas conexões PostgreSQL e restart operacional precisam staging isolado e evidência por ID.

A matriz de eventos contém os 13 enums pedidos; gatilho/template/destinatário/provider/entrega real de cada um permanece NÃO TESTADO. Trial/eventos locais não certificam a cadeia completa de comunicação. A configuração de templates publicada em DEV não foi lida com sessão administrativa. Schedulers têm inventário de código, mas sua frequência/supervisão DEV não foi comprovada.

Rate limit real de login/connect/pairing/test message/checkout/webhook não foi submetido a carga DEV. A proteção existente do login é coberta pela suíte API e o frontend 429 sem loop tem Playwright local. Isso não prova rate limit em todas as rotas. Não bombardear API/Evolution compartilhadas para preencher a matriz.

Os bugs Outbox sem provider, destinatário WhatsApp GLOBAL de owner suspenso e central após suspensão da auditoria continuam pendências; esta tarefa não corrige produto. A proposta de staging e diagnóstico não foi implementada. Tablet/mobile são emulações Chromium; Safari/iOS/aparelhos reais não homologados.

## Segurança e cleanup

Somente contas QA são aceitas nos helpers remotos. Operações de criação/checkout exigem flags explícitas; criação pode preparar Evolution COMPANY automaticamente, por isso requer configuração QA isolada previamente. Não há operação de exclusão remota automática. O script cleanup-plan verifica IDs/run/prefixos e gera apenas plano seco. O ensaio restart remove apenas seu diretório mkdtemp exato, criado pelo próprio processo.

## Checks e montagem da suíte

A primeira tentativa no sandbox não foi usada como prova funcional: havia restrições de sockets/processos e captura inadequada dos logs. Houve ajustes na fixture serverNow, contexto CDP de permissão, seletores específicos de alerta e expectativas de páginas que não usam shell. Não houve alteração desses componentes de produto.

Após o primeiro relatório Playwright, o lint encontrou JavaScript gerado do HTML/trace; o ESLint agora ignora apenas artifacts/.auth, preservando lint dos testes/scripts. Lint final passou. Logs anteriores são mantidos como tentativa; resultado-final.json registra as reexecuções. `resultado.json` preserva a execução agregada anterior à consolidação final.

Instalação de dependências informou vulnerabilidades: API seis high/três low, Web oito high. Não foi feita correção automática nem avaliação nova dessas vulnerabilidades; registrar/revisar separadamente antes do release. As alterações de manifests são dependências de teste e comandos QA; dependências de runtime não foram atualizadas.

O gate retorna código 1 por REPROVADO, mesmo com checks técnicos verdes. A suíte não faz commit, push, deploy, migration, restart DEV, escrita manual no banco remoto ou alteração PROD/main/Evolution/Docker/Nginx/relógio. Para release candidato futuro, repetir a execução nos SHAs publicados e revisar evidências reais individualmente; não reutilizar aprovações desta execução sem revalidação.
