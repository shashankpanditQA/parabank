// Challenge #9 (beginner) — Remember Me
// Objective: Log in with Remember Me checked, log out, and verify the username is pre-filled.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('remember me pre-fills username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByLabel('Remember Me').check();
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page.getByLabel('Username')).toHaveValue('john');
  await expect(page.getByLabel('Remember Me')).toBeChecked();
});
