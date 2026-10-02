// Challenge #15 (beginner) — Count Quick Actions
// Objective: Count the buttons inside the Quick Actions region.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('quick actions', async ({ page }) => {
  await page.goto('/dashboard');
  const buttons = page.getByRole('region', { name: 'Quick Actions' }).getByRole('button');
  await expect(buttons).toHaveCount(7);
  await expect(buttons).toHaveText(['Transfer Money', 'Pay Bill', 'Deposit', 'Withdraw', 'Apply Loan', 'Manage Cards', 'View Transactions']);
});
