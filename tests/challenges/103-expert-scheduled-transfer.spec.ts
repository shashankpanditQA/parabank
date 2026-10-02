// Challenge #103 (expert) — Scheduled Transfer
// Objective: Schedule a transfer for tomorrow and verify status, unchanged balance, and the dashboard pending list.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('scheduled transfer', async ({ page }) => {
  const before = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const amount = Math.floor(Math.random() * 9000) / 100 + 10;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByLabel('Schedule Transfer').check();
  await page.getByLabel('Transfer Date').fill(tomorrow);
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await expect(page.getByTestId('review-when')).toHaveText(tomorrow);
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  expect(body).toMatchObject({ status: 'SCHEDULED', scheduledDate: tomorrow });
  await expect(page.getByRole('heading', { name: 'Transfer Scheduled' })).toBeVisible();
  const after = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  expect(after).toBe(before);
  await page.goto('/dashboard');
  await expect(page.getByTestId('pending-payments')).toContainText('Scheduled ' + tomorrow);
});
