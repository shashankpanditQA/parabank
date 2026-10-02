// Challenge #96 (expert) — Parallel Workflows
// Objective: Run two UI transfers concurrently and verify both succeed and the balance drops by the sum.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

async function transfer(page: any, amount: number) {
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const res = page.waitForResponse((r: any) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const response = await res;
  expect(response.status()).toBe(201);
  return response.json();
}

test('concurrent transfers', async ({ page, context }) => {
  const before = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  const second = await context.newPage();
  const a = Math.floor(Math.random() * 5000) / 100 + 1;
  const b = a + 1.11;
  const [r1, r2] = await Promise.all([transfer(page, a), transfer(second, b)]);
  expect(r1.transactionId).not.toBe(r2.transactionId);
  const after = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  expect(after).toBe(Math.round((before - a - b) * 100) / 100);
});
