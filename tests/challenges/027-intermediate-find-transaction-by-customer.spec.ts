// Challenge #27 (intermediate) — Find Transaction by Customer
// Objective: Find the transaction containing "Amazon" and verify its amount and status without using a row index.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('find Amazon transaction', async ({ page }) => {
  await page.goto('/transactions?pageSize=50');
  const row = page.getByTestId('transaction-row').filter({ hasText: 'Amazon' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('$249.99');
  await expect(row.getByText('Completed')).toBeVisible();
  await expect(row.getByRole('cell').nth(0)).toHaveText(/^TXN-\d{6}$/);
});
