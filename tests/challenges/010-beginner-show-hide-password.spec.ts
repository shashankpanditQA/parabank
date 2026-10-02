// Challenge #10 (beginner) — Show / Hide Password
// Objective: Verify the password input switches between type="password" and type="text".
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('toggle password visibility', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('Password');
  await password.fill('Demo@123');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});
