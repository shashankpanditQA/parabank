// Challenge #22 (beginner) — Breadcrumb
// Objective: Verify the breadcrumb on the Transactions page.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('breadcrumb', async ({ page }) => {
  await page.goto('/transactions');
  const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumb.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(crumb.locator('[aria-current="page"]')).toHaveText('Transactions');
});
