// Challenge #65 (advanced) — Transaction Details Popup from a Table
// Objective: Open details for the first row and verify the popup shows the same transaction ID.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('transaction details popup', async ({ page }) => {
  await page.goto('/transactions');
  const row = page.getByTestId('transaction-row').first();
  const id = await row.getAttribute('data-transaction-id');
  const popupPromise = page.waitForEvent('popup');
  await row.getByRole('button', { name: 'Details' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Transaction Details' })).toBeVisible();
  await expect(popup.getByTestId('transaction-details')).toContainText(id!);
  await expect(popup).toHaveTitle(new RegExp(id!));
});
