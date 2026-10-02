// Challenge #36 (intermediate) — Nested Table: Customer → Account
// Objective: Find Sarah Mitchell's checking balance in the nested table and compare it with the API.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('nested table balance', async ({ page }) => {
  const res = page.waitForResponse('**/api/lab/directory');
  await page.goto('/lab/tables');
  const directory = await (await res).json();
  const sarah = directory.data.find((c: any) => c.name === 'Sarah Mitchell');
  const checking = sarah.accounts.find((a: any) => a.type === 'CHECKING');

  const group = page.getByTestId('customer-group').filter({ hasText: 'Sarah Mitchell' });
  await group.getByRole('button', { name: 'Toggle accounts for Sarah Mitchell' }).click();
  const accountRow = group.getByTestId('account-row').filter({ hasText: checking.accountNumber });
  const expected = '$' + checking.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(accountRow.getByTestId('account-balance')).toHaveText(expected);
});
