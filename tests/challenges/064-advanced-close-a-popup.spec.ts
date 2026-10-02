// Challenge #64 (advanced) — Close a Popup
// Objective: Open the statement, click 'Close Window' and verify the popup closed while the main page keeps working.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('close popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Account Statement' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Account Statement' })).toBeVisible();
  const closed = popup.waitForEvent('close');
  await popup.getByRole('button', { name: 'Close Window' }).click();
  await closed;
  expect(popup.isClosed()).toBe(true);
  await expect(page.getByTestId('window-log')).toContainText('Account Statement → opened');
});
