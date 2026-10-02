// Challenge #98 (expert) — Server Error and Retry
// Objective: Inject x-simulate-failure: 500 into the first POST only, verify the error, then retry successfully.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('500 then retry', async ({ page }) => {
  const amount = Math.floor(Math.random() * 3000) / 100 + 5;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  // Register after the page has loaded its own GET /api/transfers, and only touch the POST.
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'POST'
      ? route.continue({ headers: { ...route.request().headers(), 'x-simulate-failure': '500' } })
      : route.continue(),
  { times: 1 });
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByTestId('transfer-error-code')).toHaveText('INTERNAL_SERVER_ERROR');

  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await expect(page.getByLabel('OTP')).toHaveValue('123456');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByRole('heading', { name: 'Transfer Successful' })).toBeVisible();
});
