// Challenge #23 (beginner) — Follow a Link
// Objective: Click "View all" in Recent Transactions and verify the URL.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('view all link', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'View all' }).click();
  await expect(page).toHaveURL(/\/transactions/);
  await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
});
