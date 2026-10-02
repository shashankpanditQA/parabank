// Challenge #70 (advanced) — Validate the Transfer API Response
// Objective: Capture POST /api/transfers with waitForResponse and validate status and JSON.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('transfer API response', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 1;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.transactionId).toMatch(/^TXN-\d{6}$/);
  expect(body.amount).toBe(Number(amount.toFixed(2)));
  expect(body.status).toBe('COMPLETED');
  await expect(page.getByTestId('transfer-transaction-id')).toHaveText(body.transactionId);
});
