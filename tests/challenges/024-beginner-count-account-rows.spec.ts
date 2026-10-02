// Challenge #24 (beginner) — Count Account Rows
// Objective: Verify the accounts table shows 3 rows with the expected account types.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('account rows', async ({ page }) => {
  await page.goto('/accounts');
  const rows = page.getByTestId('account-row');
  await expect(rows).toHaveCount(3);
  for (const type of ['Checking', 'Savings', 'Credit']) {
    await expect(rows.filter({ hasText: type })).toHaveCount(1);
  }
});
