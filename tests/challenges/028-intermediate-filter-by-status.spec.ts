// Challenge #28 (intermediate) — Filter by Status
// Objective: Filter by "Failed" and verify every row is Failed.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('filter by status', async ({ page }) => {
  await page.goto('/transactions');
  const filtered = page.waitForResponse((r) => r.url().includes('/api/transactions') && r.url().includes('status=Failed'));
  await page.getByLabel('Status').selectOption('Failed');
  await filtered;
  await expect(page).toHaveURL(/status=Failed/);
  const texts = await page.getByTestId('transaction-row').allInnerTexts();
  expect(texts.length).toBeGreaterThan(0);
  for (const t of texts) expect(t).toContain('Failed');
});
