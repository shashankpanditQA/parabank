// Challenge #100 (expert) — Invalid JSON Handling
// Objective: Make GET /api/transactions return invalid JSON and verify the error state.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('invalid JSON', async ({ page }) => {
  const handler = (route: any) => route.continue({ headers: { ...route.request().headers(), 'x-simulate-failure': 'invalid-json' } });
  const isList = (url: URL) => url.pathname === '/api/transactions';
  await page.route(isList, handler);
  await page.goto('/transactions');
  const error = page.getByTestId('error-state');
  await expect(error).toContainText('not valid JSON');
  await expect(error).toContainText('INVALID_JSON');
  await page.unroute(isList, handler);
  await error.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('transaction-row').first()).toBeVisible();
});
