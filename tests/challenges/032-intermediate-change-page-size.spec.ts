// Challenge #32 (intermediate) — Change Page Size
// Objective: Set 25 rows per page and verify 25 rows are shown.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('page size 25', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByLabel('Rows per page').selectOption('25');
  await expect(page.getByTestId('transaction-row')).toHaveCount(25);
  await expect(page.getByTestId('pagination-summary')).toContainText('Showing 1–25');
});
