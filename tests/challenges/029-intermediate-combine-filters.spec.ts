// Challenge #29 (intermediate) — Combine Filters
// Objective: Show only Salary transactions for the checking account.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('type + account filters', async ({ page }) => {
  const accounts = await (await page.request.get('/api/accounts')).json();
  const checking = accounts.data.find((a: any) => a.accountType === 'CHECKING').accountNumber;
  await page.goto('/transactions');
  await page.getByLabel('Transaction Type').selectOption('Salary');
  await page.getByLabel('Account', { exact: true }).selectOption(checking);
  await expect(page.getByTestId('active-filter-count')).toHaveText('2');
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toContainText('Salary');
  for (const row of await rows.all()) {
    await expect(row).toContainText('Salary');
    await expect(row).toContainText(checking);
  }
});
