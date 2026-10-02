// Challenge #63 (advanced) — Popup Authentication
// Objective: Open the portal, log in as sarah and validate the secure dashboard — without affecting john in the main window.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('popup login', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Secure Banking Portal' }).click();
  const portal = await popupPromise;
  await portal.getByLabel('Username').fill('sarah');
  await portal.getByLabel('Password').fill('Demo@123');
  await portal.getByRole('button', { name: 'Login' }).click();
  await expect(portal.getByRole('heading', { name: 'Secure Dashboard' })).toBeVisible();
  await expect(portal.getByTestId('portal-user')).toHaveText('Sarah Mitchell');
  await expect(portal.getByTestId('portal-accounts').getByRole('row')).not.toHaveCount(0);
  await expect(page.getByTestId('header-username')).toHaveText('John Carter');
});
