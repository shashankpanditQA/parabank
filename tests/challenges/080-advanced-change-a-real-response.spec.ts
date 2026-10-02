// Challenge #80 (advanced) — Change a Real Response
// Objective: Change the first account balance to 123456.78 using route.fetch().
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('patch real response', async ({ page }) => {
  await page.route('**/api/accounts', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data[0].currentBalance = 123456.78;
    await route.fulfill({ response, json });
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toContainText('$123,456.78');
});
