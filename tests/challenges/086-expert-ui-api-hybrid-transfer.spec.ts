// Challenge #86 (expert) — UI + API Hybrid Transfer
// Objective: Transfer money in the UI, capture the API response, then find the new transaction in the table by its ID.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('hybrid transfer', async ({ page }) => {
  const amount = Math.floor(Math.random() * 5000) / 100 + 2;
  const description = 'Hybrid ' + Date.now();
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  await expect(page.getByTestId('success-toast')).toContainText(body.transactionId);

  await page.goto('/transactions?search=' + body.transactionId);
  const row = page.locator('[data-transaction-id="' + body.transactionId + '"]');
  await expect(row).toContainText(description);
  await expect(row).toContainText('-$' + amount.toFixed(2));
  await expect(row).toContainText('Completed');
});
