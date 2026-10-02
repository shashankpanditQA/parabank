// Challenge #11 (beginner) — Forgot Password
// Objective: Submit the form and verify a reset reference like RST-123456 is shown.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('forgot password', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot Password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await page.getByLabel('Username or Email').fill('john');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByTestId('forgot-result')).toContainText(/RST-\d{6}/);
});
