// Challenge #3 (beginner) — Invalid Password
// Objective: Log in as john with a wrong password and validate the error message.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('invalid password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();
  const error = page.getByTestId('login-error');
  await expect(error).toContainText('The password you entered is incorrect.');
  await expect(error).toContainText('INVALID_PASSWORD');
  await expect(page).toHaveURL(/\/login/);
});
