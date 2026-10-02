// Challenge #35 (intermediate) — Clear Filters
// Objective: Apply a filter, then clear it and verify the full list returns.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('clear filters', async ({ page }) => {
  await page.goto('/transactions?status=Pending');
  await expect(page.getByTestId('active-filter-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  await expect(page.getByText('No filters applied')).toBeVisible();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.getByLabel('Status')).toHaveValue('');
});
