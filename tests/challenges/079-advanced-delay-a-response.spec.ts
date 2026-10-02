// Challenge #79 (advanced) — Delay a Response
// Objective: Delay GET /api/accounts by 2 seconds and assert the loading indicator appears then disappears.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('delayed response shows loader', async ({ page }) => {
  await page.route('**/api/accounts', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  const loader = page.getByTestId('loading-indicator');
  await expect(loader).toHaveText('Loading accounts...');
  await expect(loader).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('network-account').first()).toBeVisible();
});
