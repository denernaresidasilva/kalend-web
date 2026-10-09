# Tela futura: Super Admin → Sistema → Diagnóstico

Proposta apenas. Backend protegido por AdminGuard, sem expor segredos, com timeout e resultado desconhecido quando integração não consultada. Cards API, PostgreSQL, Redis (se usado), Worker, Scheduler, Evolution, WhatsApp GLOBAL, SMTP, Push. Mostrar última execução trial/outbox com duração/heartbeat, pending/failed/uncertain e último webhook de pagamento redigido com correlation.

Distinguir configuração, conectividade, aceite e entrega. WhatsApp open não comprova recebimento; Push granted não comprova subscription; SMTP credenciais presentes não comprova e-mail. Leitura não deve reconectar, enviar mensagens, reconciliar pagamento ou disparar jobs automaticamente. Timestamp UTC e idade do heartbeat; acesso GLOBAL só Super Admin. Não implementado.
