// Challenge #30 (intermediate) — Sort by Amount
// Objective: Sort by Amount ascending and verify the amounts are in ascending order.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('sort by amount', async ({ page }) => {
  await page.goto('/transactions');
  const header = page.getByRole('columnheader', { name: 'Amount', exact: true });
  await header.getByRole('button').click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await expect(page).toHaveURL(/sortBy=amount/);
  const cells = page.getByTestId('transaction-row').locator('td:nth-child(5)');
  await expect(cells.first()).toBeVisible();
  const values = (await cells.allInnerTexts()).map((t) => Number(t.replace(/[^\d.]/g, '')));
  expect(values).toEqual([...values].sort((a, b) => a - b));
});
