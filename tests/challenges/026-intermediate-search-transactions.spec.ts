// Challenge #26 (intermediate) — Search Transactions
// Objective: Search for "Netflix" and verify every visible row mentions Netflix.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('search transactions', async ({ page }) => {
  await page.goto('/transactions');
  const searched = page.waitForResponse((r) => r.url().includes('/api/transactions') && r.url().includes('search=Netflix'));
  await page.getByLabel('Search').fill('Netflix');
  await searched;
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toContainText('Netflix');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText(/netflix/i);
  }
});
