// Challenge #99 (expert) — Slow API and Skeleton Loaders
// Objective: Delay GET /api/accounts via the x-simulate-delay header and assert skeleton → data.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('skeleton while slow', async ({ page }) => {
  await page.route('**/api/accounts', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-simulate-delay': '3000' } }),
  );
  const started = Date.now();
  await page.goto('/accounts');
  await expect(page.getByTestId('table-skeleton')).toBeVisible();
  await expect(page.getByTestId('account-row').first()).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(2900);
});
