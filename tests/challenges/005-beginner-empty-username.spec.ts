// Challenge #5 (beginner) — Empty Username
// Objective: Submit with only a password and verify the "Username is required" message.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('empty username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Username is required')).toBeVisible();
  await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true');
});
