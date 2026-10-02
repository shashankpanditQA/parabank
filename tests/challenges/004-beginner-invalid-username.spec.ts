// Challenge #4 (beginner) — Invalid Username
// Objective: Log in as "nobody" and verify the INVALID_USERNAME error.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('invalid username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('nobody');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByTestId('login-error')).toContainText('No account was found with that username.');
  await expect(page.getByTestId('login-error')).toContainText('INVALID_USERNAME');
});
