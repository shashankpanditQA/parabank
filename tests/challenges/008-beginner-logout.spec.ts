// Challenge #8 (beginner) — Logout
// Objective: Open the user menu, click Logout and verify you are back on the login page.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('logout', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('session-message')).toHaveText('You have been logged out successfully.');
});
