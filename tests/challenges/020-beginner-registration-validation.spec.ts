// Challenge #20 (beginner) — Registration Validation
// Objective: Submit the empty registration form and verify field errors.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('registration validation', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('First name is required.')).toBeVisible();
  await expect(page.getByText('Last name is required.')).toBeVisible();
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
});
