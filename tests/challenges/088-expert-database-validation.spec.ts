// Challenge #88 (expert) — Database Validation
// Objective: After a UI transfer, verify the transfers and transactions tables contain matching rows.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('database state after transfer', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 3;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();

  const transfers = await (await page.request.get('/api/lab/db/transfers?id=' + body.transferId)).json();
  expect(transfers.rows[0]).toMatchObject({
    id: body.transferId, transaction_id: body.transactionId, from_account: body.fromAccount,
    to_account: body.toAccount, amount: body.amount, status: 'COMPLETED',
  });
  const txs = await (await page.request.get('/api/lab/db/transactions?id=' + body.transactionId)).json();
  expect(txs.rows[0]).toMatchObject({ account_id: body.fromAccount, direction: 'DEBIT', amount: body.amount, balance_after: body.balanceAfter, reference: body.transferId });
});
