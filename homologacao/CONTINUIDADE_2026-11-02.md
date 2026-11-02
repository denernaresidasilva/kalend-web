# KALEND — continuidade do desenvolvimento, 02/11/2026

O prompt mestre continua parcialmente concluído. Este documento registra entregas reais e as funcionalidades ainda pendentes, sem substituir os módulos existentes.

## Entregas desta continuação

| Fase | API / Actions | Web / Actions | Verificação DEV |
| --- | --- | --- | --- |
| Agenda interna e aprovação | 9d7cbf4 / 41499239046 | 64baa40 / 41499638624 | 10 casos HTTP e 2 Chromium, 390/1366 px |
| Eventos de solicitações | c97595c / 41500520503 | bfb1fca / 41500699812 | 4 casos, pedido visível em 184 ms, agenda após aprovação, isolamento A/B/profissional |
| Ativação e painel cliente | ae53eaa / 41501945778 | bddc7d3 / 41502210805 | 6 casos, convite único, login CLIENT, histórico próprio, catálogo público anônimo |
| Gestão de serviços/profissionais | 9a502a2 / 41502863490 | c88e68c / 41503118740 tentativa 2 | 3 casos mobile/HTTP: persistência, permissões/tenant e snapshots |
| Paletas e navegação mobile | Sem mudança API | Commit e Actions conferidos ao concluir | Validação posterior ao deploy |

Todos os runs das quatro primeiras fases terminaram com sucesso. A tentativa inicial do run Web da gestão falhou por timeout TCP/SSH antes de executar comandos remotos; somente o job falho foi repetido pelo GitHub, sem deploy manual. Não houve reset destrutivo nem force push; ambos os workflows agora atualizam DEV por merge --ff-only.

O núcleo anterior ca6f0dc/c27385b foi preservado e publicado com as correções comprovadas. Arquivos históricos não rastreados e caches Python preexistentes permanecem na API, fora dos commits desta tarefa.

## Fluxo prioritário comprovado

Catálogo público real → profissional e horário → carrinho de dois serviços sem sobreposição → identificação → pedido persistido → inbox/notificação do estabelecimento → aceitar → agenda interna. O percurso público foi executado em Chromium anônimo mobile contra a API DEV real, sem interceptações de HTTP. [Resultado](evidencias/2026-11-02-continuacao/public-browser-dev.json).

Convite emitido pelo estabelecimento habilita a área do cliente com token de 256 bits, hash persistido, prazo, uso único e aceite. Conta existente exige sua senha atual. Não há criação de privilégios administrativos nem vínculo de identidade por mera coincidência de e-mail. Novo pedido com perfil já ativado exige o usuário autenticado correspondente. Compartilhamento do convite é manual; não foi comprovada entrega por e-mail/WhatsApp/Push.

A agenda e os eventos respeitam a empresa selecionada e filtram itens de pedidos compartilhados por profissional. Alterações de serviços preservam snapshots; gestão de profissionais respeita limites do plano e papel/membership ativo. [Gestão DEV](evidencias/2026-11-02-continuacao/management-dev.json).

## Testes e operação

27 cenários PostgreSQL nativos distintos foram aprovados: 26 na última bateria operacional e o caso adicional de duplicata isoladamente; não somar execuções repetidas. Última suíte unitária API completa: 927 casos; mudanças posteriores de gestão tiveram 47 testes direcionados e verificações nativas. E2E: 215 casos dos demais arquivos passaram; cinco falhas no arquivo financeiro foram rastreadas a fixture dependente de subtrair 30 dias como mês. Ajustada apenas a fixture; seus 38 casos passaram na reexecução. Não se alterou regra comercial para acomodar testes.

Builds/lints/tipos aprovados com Node 24.21.0. Web tinha 407 testes antes dos três casos de paleta; resultado final é acrescentado ao concluir. Migration operacional e migration de ativação tiveram ledger/checksum conferidos em kalend_dev. PaymentEvidence preservado com 5 registros, 3 APPLIED. Backups DEV privados foram atualizados e restaurados em clusters isolados antes das publicações; último inventário anterior à gestão: 38 tabelas e 23 migrations.

Identidades efetivas: runtime kalend_dev_runtime e migration kalend_dev_migrator. SSH API kalend-api-dev e Web kalend-dev, em srv1119527 e diretórios DEV existentes. Sem alteração de PROD, outros projetos, sudoers/SSH/autenticação compartilhada, cobranças ou envios externos.

## Estado dos 16 grupos do prompt mestre

| Grupo | Estado concreto | Funcionalidades restantes |
| --- | --- | --- |
| Proprietário | Inbox, aprovação/recusa, agenda diária, serviços/profissionais/disponibilidade | Indicadores operacionais completos, equipe e rotinas comerciais |
| Agenda interna | Confirmados por dia/fuso e profissional | Criação interna, reagendamento, cancelamento, bloqueios/férias/recorrência |
| Agenda pública marketplace | Catálogo, profissionais, disponibilidade e fluxo completo | Busca/filtros avançados, imagens, descoberta entre estabelecimentos e subdomínios |
| Carrinho | Até oito serviços e validação de sobreposição | Melhorias de navegação e combinações automáticas de horários |
| Solicitações | Persistência, notificações internas, SSE e decisão transacional | Confirmação externa e mensagens finais por canais autorizados |
| Clientes | Perfil tenant, convite seguro e ativação de identidade | CRUD completo, recuperação específica e entrega autenticada do convite |
| Profissional | Seus itens na inbox e agenda | Execução/conclusão de serviços, produtividade e comissões |
| Recepção | Inbox/decisão/agenda e emissão de convite | Cadastro completo, agenda interna e PDV |
| Contador | Ainda não implementado | Papel próprio, painel, relatórios/exportação financeira operacional |
| Cliente | Login e histórico próprio | Cancelamento/reagendamento, confirmação e fidelidade |
| PDV/comandas/caixa/comissões | Ainda não implementado | Modelo e operações transacionais; não confundir com cobrança SaaS existente |
| Mensagens e automações | Infraestrutura e templates comerciais anteriores preservados | Integração com agendamentos/atendimento e mensagens prontas operacionais |
| Follow-up por serviço | Ainda não implementado | Regras, consentimento, agendamento e execução por serviço |
| Configurações/permissões | Papéis/tenant/limites e gestão operacional | Permissões granulares e configurações comerciais restantes |
| Paletas | Cinco opções locais, sem dados de conta em storage | Branding persistido da empresa ainda não implementado |
| PWA mobile | Manifest/SW existentes, nova navegação fixa em validação | Instalação em aparelho real e rotinas operacionais offline não homologadas |

Próxima fase funcional: atendimento interno e cancelamento/reagendamento, seguidos de PDV/comandas/caixa/comissões e painel do contador. Não há alegação de sistema completo ou liberação oficial de todos os painéis.
