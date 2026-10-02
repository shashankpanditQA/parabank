// Challenge #7 (beginner) — Locked User
// Objective: Log in as locked / Demo@123 and verify the locked-account message.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('locked user cannot log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('locked');
  await page.getByLabel('Password').fill('Demo@123');
  const response = page.waitForResponse('**/api/auth/login');
  await page.getByRole('button', { name: 'Login' }).click();
  expect((await response).status()).toBe(423);
  await expect(page.getByTestId('login-error')).toContainText('Your account has been locked');
});
