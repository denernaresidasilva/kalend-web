# Proposta de staging (não implantada)

Frontend staging.kalend.tech, API api-staging.kalend.tech, banco kalend_staging com usuário SQL próprio e nenhum acesso PROD. Branch/release candidata por SHA; build NEXT_PUBLIC_API_URL staging; cookies/sessões restritos a staging, AUTH origin allowlist exclusiva, signing/encryption/VAPID keys próprias. Nunca restaurar PII real sem anonimização.

Redis separado preferencialmente; se compartilhado fisicamente, DB lógico/ACL e namespace kalend:staging exclusivos, sem permissões PROD. A auditoria não comprovou dependência Redis em todos os componentes; provisionar conforme necessidade, não inventar health Redis aprovado. Workers/schedulers supervisionados com logs e última execução, exclusão mútua/leases persistidas; ensaio PostgreSQL multiconexão.

Gateway SANDBOX com contas e webhooks /api-staging próprios, segredos distintos e rejeição de eventos live. Evolution existente não deve ser alterada: sessão QA exclusiva kalend_staging_qa, conexão COMPANY separada, sem destruir kalend_dev_global. Avaliar permissões dedicadas antes da integração. SMTP Mailpit/MailHog ou provider test sem capacidade de envio a cliente; domínios/destinos allowlist QA. VAPID staging próprio e subscription origins isoladas.

Processo: criar runId/ledger → fixtures QA → ensaios → recebimentos provider → restart controlado → matriz/gate → cleanup IDs registrados → aprovar release. Rollback por artefato/SHA anterior, sem reset local ou migration criada pela suíte; migrations versionadas revisadas antes de qualquer deploy. Não publicar staging ou alterar DNS/Nginx/Docker nesta tarefa.
