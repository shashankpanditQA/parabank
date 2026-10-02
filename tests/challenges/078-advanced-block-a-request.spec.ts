// Challenge #78 (advanced) — Block a Request
// Objective: Abort GET /api/lab/fx-rates and verify the network error UI.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('block fx rates', async ({ page }) => {
  await page.route('**/api/lab/fx-rates', (route) => route.abort());
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load FX Rates' }).click();
  await expect(page.getByTestId('network-fx-error')).toContainText('Network error');
});
