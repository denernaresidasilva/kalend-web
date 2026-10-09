# Checklist oficial de release

Release/SHA API: ____; Web: ____; ambiente: ____; execução/evidências: ____; responsável: ____.

- [ ] API tests
- [ ] E2E local e HTTP API
- [ ] Web tests
- [ ] Build API/Web
- [ ] TypeScript API/Web
- [ ] Prisma validate e migrations esperadas
- [ ] Health API/Web
- [ ] Login autenticado QA
- [ ] Nova empresa + OWNER/membership
- [ ] Trial completo sem depender de scheduler
- [ ] Popup plano e allowlist
- [ ] Checkout plano/valor/referência
- [ ] Pagamento real sandbox e webhook idempotente
- [ ] WhatsApp QA real recebido
- [ ] E-mail SMTP QA real recebido
- [ ] Push real recebido
- [ ] Popup Push BUG-01 encerrado em DEV
- [ ] Outbox com provider indisponível/retry
- [ ] Entregas UI correspondem ao provider
- [ ] Falhas UI correspondem à persistência
- [ ] Logs sem segredos e correlation correta
- [ ] Segurança crítica e isolamento tenant
- [ ] GLOBAL x COMPANY
- [ ] Mobile/tablet/desktop
- [ ] Jobs/múltiplas instâncias/recovery após restart no teste
- [ ] git diff --check
- [ ] Rollback preparado (SHA anterior, artefatos, backup DEV/staging, validação)
- [ ] Matriz sem cenário crítico NÃO TESTADO/FALHA
- [ ] Gate APROVADO ou ressalva não crítica revisada

Não marcar por existência de código/mocks. Cada checkbox exige link de evidência da release. Sem deploy neste trabalho.
