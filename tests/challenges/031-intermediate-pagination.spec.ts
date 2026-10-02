// Challenge #31 (intermediate) — Pagination
// Objective: Go to page 2 using Next and verify the pagination state.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('pagination next', async ({ page }) => {
  await page.goto('/transactions');
  const firstId = await page.getByTestId('transaction-row').first().getAttribute('data-transaction-id');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('pagination-summary')).toContainText('Showing 11–20');
  await expect(page.getByTestId('transaction-row').first()).not.toHaveAttribute('data-transaction-id', firstId!);
  await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
});
