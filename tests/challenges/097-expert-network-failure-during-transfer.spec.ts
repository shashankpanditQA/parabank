// Challenge #97 (expert) — Network Failure During Transfer
// Objective: Abort POST /api/transfers, verify the UI error and that no transfer was recorded.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('network failure', async ({ page }) => {
  const before = (await (await page.request.get('/api/transfers')).json()).count;
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'POST' ? route.abort('failed') : route.continue(),
  );
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(12.34.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByTestId('transfer-error')).toContainText('Network error');
  await expect(page.getByTestId('transfer-error-code')).toHaveText('NETWORK_ERROR');
  const after = (await (await page.request.get('/api/transfers')).json()).count;
  expect(after).toBe(before);
});
