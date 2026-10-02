// Challenge #59 (advanced) — Popup: Account Statement
// Objective: Click "Open Account Statement" and validate the newly opened page.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('account statement popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Account Statement' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/\/popups\/statement/);
  await expect(popup).toHaveTitle('Account Statement | ParaBank Pro');
  await expect(popup.getByRole('heading', { name: 'Account Statement' })).toBeVisible();
  await expect(popup.getByTestId('statement-table')).toBeVisible();
});
