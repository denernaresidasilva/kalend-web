import { test, expect } from '@playwright/test';
import { installFixture } from '../helpers/fixture';

test('OUTBOX sem provider aparece como bloqueio, nunca como entrega', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  const { state } = await installFixture(context, { admin: true });
  state.communication.outboxFailures = [{
    id: 'qa-outbox-no-provider', event: 'TRIAL_EXPIRED', companyId: 'qa-company',
    expandedAt: null, lastError: 'NO_ACTIVE_PROVIDER', createdAt: '2026-10-13T12:00:00.000Z',
  }];
  state.communication.deliveries = [
    { id: 'qa-retry', outboxId: 'qa-event-retry', channel: 'EMAIL', provider: 'SMTP', environment: 'SANDBOX', recipientMasked: 'q***@***', status: 'RETRY', attempts: 1, nextAttemptAt: '2026-10-13T12:01:00.000Z', lastError: 'COMMUNICATION_TRANSIENT', createdAt: '2026-10-13T12:00:00.000Z' },
    { id: 'qa-accepted', outboxId: 'qa-event-accepted', channel: 'EMAIL', provider: 'SMTP', environment: 'SANDBOX', recipientMasked: 'q***@***', status: 'ACCEPTED', attempts: 1, nextAttemptAt: '2026-10-13T12:00:00.000Z', lastError: null, createdAt: '2026-10-13T12:00:00.000Z' },
  ];
  state.communication.failures = [{
    id: 'qa-failed', outboxId: 'qa-event-failed', channel: 'EMAIL', provider: 'SMTP', environment: 'SANDBOX', recipientMasked: 'q***@***', status: 'FAILED', attempts: 5, nextAttemptAt: '2026-10-13T12:00:00.000Z', lastError: 'COMMUNICATION_PERMANENT', createdAt: '2026-10-13T12:00:00.000Z',
  }];

  await page.goto('/super-admin/comunicacao');
  await page.getByRole('button', { name: 'Falhas', exact: true }).click();
  const expansionFailures = page.getByRole('region', { name: 'Falhas de expansão da Outbox' });
  await expect(expansionFailures).toContainText('NO_ACTIVE_PROVIDER');
  await expect(expansionFailures).toContainText('Pendente de configuração');
  await expect(expansionFailures).not.toContainText('Aceito pelo provedor');

  await page.getByRole('button', { name: 'Entregas', exact: true }).click();
  const deliveries = page.locator('section[aria-label="Entregas"]');
  await expect(deliveries).toContainText('Aguardando nova tentativa');
  await expect(deliveries).toContainText('Aceito pelo provedor');
  await expect(deliveries).not.toContainText('qa-outbox-no-provider');

  await page.getByRole('button', { name: 'Falhas', exact: true }).click();
  await expect(page.locator('section[aria-label="Falhas"]')).toContainText('Falha');
});
