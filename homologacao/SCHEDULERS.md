# Inventário e ensaios de jobs

| Responsável/arquivo API | Frequência | Estado/lock | Recovery/ensaio obrigatório |
|---|---|---|---|
| communication/scheduler.ts | Invocação única; timer externo não comprovado | COMMUNICATION_SCHEDULER_ENABLED; chama cleanup/lifecycle/temporal/inbox | Registrar último run/supervisão; restart antes/depois do commit |
| communication/worker.ts | Invocação única; timer externo não comprovado | COMMUNICATION_WORKER_ENABLED; engine.run | Outbox persistida; replay; processo morto antes/depois do envio |
| billing/lifecycle.service.ts | Scheduler ou reconcile administrativo | Lote 100, pagamentos rotacionados updatedAt, transação de entitlement | Trial <=now; grace/ACTIVE/cancelamento; concorrência PostgreSQL |
| communication/engine.ts temporal | Scheduler e worker | TRIAL_EXPIRING horizonte 3 dias; businessKey UNIQUE/ON CONFLICT | Janela perdida no downtime pode não gerar aviso; registrar, não esconder |
| communication/engine.ts expand/run | Timer externo worker | FOR UPDATE SKIP LOCKED na expansão; claim transacional de delivery | SENDING antigo → UNCERTAIN; não reenvio automático ambíguo |
| notifications/notifications.service.ts ingest/cleanup | Scheduler/worker | Marcas persistidas; verificar testes existentes | Nenhuma perda/duplicação após novo processo |
| communication/push.ts cleanup | Scheduler | Subscription/dispositivos no banco | Expiração/revogação QA, sem dispositivo real apagado |
| communication/evolution.ts maintenance | setInterval 30s no processo API | Lock maintaining local + registros persistidos | QR/códigos expirados removidos após restart; preservar sessão principal |

Sem cron de agenda/campanhas/lembretes encontrado na auditoria; não inventar jobs. Periodicidade operacional DEV não comprovada por existência destes arquivos. UTC/Date aplicação e timestamps SQL; timezone company só apresentação/regra específica. Fake clock exclusivamente processo teste. Nenhum restart DEV executado pela suíte padrão.

Restart atualmente automatizado parcialmente: novo AuthService no HTTP e2e/SQL confirma entitlement vencido sem scheduler. Isso **não** prova restart de worker multirréplica ou ausência de perda externa; esses ensaios ficam NÃO TESTADO até PostgreSQL/staging isolados.

Novo ensaio automatizado: `kalend-api/scripts/validate-restart-recovery.mjs`, dois processos Node independentes e PGlite em disco descartável. Processo A persiste trial/outbox/retry/SENDING, encerra; processo B reabre o banco, valida entitlement sem scheduler e executa engine.run para quarantinar SENDING antigo. Não equivale a PM2 DEV, queda de energia/PostgreSQL multirréplica ou recebimento de provider.
