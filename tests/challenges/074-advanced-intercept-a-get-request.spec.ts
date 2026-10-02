// Challenge #74 (advanced) — Intercept a GET Request
// Objective: Count GET /api/accounts requests made when clicking "Load Accounts", letting them continue.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('intercept GET', async ({ page }) => {
  let intercepted = 0;
  await page.route('**/api/accounts', async (route) => {
    expect(route.request().method()).toBe('GET');
    intercepted++;
    await route.continue();
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toBeVisible();
  expect(intercepted).toBe(1);
});
