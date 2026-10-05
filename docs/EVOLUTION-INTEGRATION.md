# Evolution — DEV/produção e recuperação do QR

**Uma empresa = uma instância por ambiente. O Super Admin possui uma conexão GLOBAL independente.** Correção local das pendências da auditoria; nenhuma publicação, chave pública ou alteração de ambiente foi feita.

A interface permanece nativa: Configurar prepara automaticamente a instância e mostra QR. GLOBAL usa AdminGuard e /communication/evolution; COMPANY usa TenantGuard OWNER/ADMIN e /company/communication/evolution. tenantApi, invalidação da sessão, abort/versionamento e componentes visuais existentes foram preservados.

## Ambiente

Backend exige EVOLUTION_WEBHOOK_BASE_URL, sem fallback: DEV usa https://api-dev.kalend.tech; produção usa https://api.kalend.tech. NODE_ENV não decide o namespace. Coerência com BILLING_PUBLIC_API_URL e DATABASE_URL é verificada pelo backend. Frontend não informa ambiente/nome/instância/chave.

Nomes backend:
- DEV: kalend_dev_global e kalend_dev_<UUID>;
- produção: kalend_global e kalend_<UUID>, com preservação de GLOBAL produtivo legacy válido.

Registros explícitos do outro ambiente são recusados. Vínculos DEV legacy sem prefixo são associados ao nome DEV antes de chamadas remotas; a instância antiga ambígua não é consultada/desconectada/excluída. Empresa/dados comerciais permanecem, mas WhatsApp DEV pode exigir novo pareamento.

## QR e pairing

Cache de payload por processo removido no backend. Réplicas consultam Evolution e compartilham somente fingerprint HMAC, expiração e cooldown de recuperação. QR/pairing não são guardados permanentemente em banco/browser storage.

QR expirado é ocultado e mostra “Solicitando um novo código automaticamente na mesma conexão...”. Polling moderado de 10 segundos continua durante tentativa, inclusive recuperação. Backend primeiro usa connect na mesma instância; somente uma tentativa connecting expirada/sem código pode usar POST restart. Estado close usa connect, open não é reiniciado. Não executa create/delete por expiração.

Pairing usa GET connect?number exclusivamente através do Kalend API. Telefone validado/normalizado; código exibido exatamente como retornado. Recuperação sem número pode retornar QR; novo pairing exige informar o telefone novamente. Nenhum número de tentativa ou código é persistido desnecessariamente.

Conexão concluída, logout/delete, troca de empresa/sessão e unmount param polling e descartam respostas antigas. Logout mantém vínculo; exclusão confirmada não recria em loop. Sem Sandbox, seletor de ambiente, fields técnicos ou NEXT_PUBLIC_EVOLUTION_API_KEY. Logs do provedor serão verificados na VPS; o Kalend não registra headers/tokens/QR.

## Validação e banco

npm test: 16 arquivos aprovados; testes Evolution: 25 casos; lint e build -- --webpack aprovados com Node 24.21.0. API possui 628 casos, 119 e2e e 21 testes HTTP/TLS integrados, incluindo fluxos React/Web reais com provedor simulado.

As duas migrations anteriores permaneceram intactas. Uma terceira acrescenta vínculo de ambiente e metadados efêmeros de recuperação; nenhuma foi aplicada. Preflight por snapshot/DEV read-only disponível no backend, sem acesso a produção nesta tarefa.

Arquitetura, variáveis sem valores secretos, transição legacy, código/SQL e operação do preflight: [relatório completo](../../kalend-api/docs/EVOLUTION-INTEGRATION.md).

VPS, dados/DDL DEV reais, aparelho/navegador físico, logs do provedor e concorrência real: **NÃO VALIDADO**. A janela de 45 segundos é política local, não TTL contratual da Evolution.

SEM GIT ADD.
SEM COMMIT.
SEM PUSH.
SEM DEPLOY.
SEM RESTART PM2.
SEM MIGRATION APLICADA.
