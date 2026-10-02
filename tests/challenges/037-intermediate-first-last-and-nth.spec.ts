// Challenge #37 (intermediate) — first(), last() and nth()
// Objective: Verify the first row is the newest transaction and matches the API response order.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('positional locators', async ({ page }) => {
  const res = page.waitForResponse((r) => r.url().includes('/api/transactions?'));
  await page.goto('/transactions');
  const body = await (await res).json();
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toHaveAttribute('data-transaction-id', body.data[0].transactionId);
  await expect(rows.nth(1)).toHaveAttribute('data-transaction-id', body.data[1].transactionId);
  await expect(rows.last()).toHaveAttribute('data-transaction-id', body.data[body.data.length - 1].transactionId);
});
