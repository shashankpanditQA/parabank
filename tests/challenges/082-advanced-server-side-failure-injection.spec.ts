// Challenge #82 (advanced) — Server-side Failure Injection
// Objective: Enable a 500 on /api/accounts, verify the error UI, clear it and verify recovery.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('inject 500 and recover', async ({ page }) => {
  await page.goto('/lab/network');
  await page.getByLabel('Failure Mode').selectOption('500');
  await page.getByLabel('Endpoint', { exact: true }).selectOption('/api/accounts');
  await page.getByRole('button', { name: 'Enable Failure' }).click();
  await expect(page.getByTestId('simulation-config')).toContainText('Failure: 500');

  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-accounts-error')).toContainText('INTERNAL_SERVER_ERROR');

  await page.getByRole('button', { name: 'Clear All Simulations' }).click();
  await expect(page.getByTestId('simulation-config')).toContainText('No simulations active');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toBeVisible();
});
