import { test, expect } from '@playwright/test';
import { installFixture } from '../helpers/fixture';
test('CHECKOUT-annual: preço, plano, referência e chave de intento', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  const { state, plan } = await installFixture(context, { offset: 1000 });
  await page.goto('/painel/proprietario'); const dialog = page.locator('.k-trial-expired-modal'); await expect(dialog).toBeVisible();
  await dialog.locator('input[name=plan]').check();
  await expect(dialog.locator('.k-plan-price')).toContainText('99,00');
  await dialog.getByLabel('Anual', { exact: true }).check();
  await expect(dialog.locator('.k-plan-price')).toContainText('990,00');
  await expect(dialog).toContainText(/Total selecionado:\s*R\$\s*990,00/);
  await dialog.locator('select').first().selectOption('STRIPE');
  await dialog.getByRole('button', { name: 'Iniciar checkout' }).click();
  await expect(dialog).toContainText('Referência: qa-payment');
  expect(state.checkout).toHaveLength(1);
  expect(state.checkout[0]).toMatchObject({ planId: plan.id, billingInterval: 'YEARLY', gateway: 'STRIPE', recurring: false });
  expect((state.checkout[0] as { idempotencyKey: string }).idempotencyKey).toMatch(/^[a-f0-9-]{36}$/i);
  await expect(dialog.getByRole('link', { name: /pagamento/i })).toHaveAttribute('href', 'https://checkout.example.invalid/qa');
});
