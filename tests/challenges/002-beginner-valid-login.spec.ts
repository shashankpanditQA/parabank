// Challenge #2 (beginner) — Valid Login
// Objective: Log in as john / Demo@123 and verify you reach the dashboard.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('valid login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Welcome back, John' })).toBeVisible();
  await expect(page.getByTestId('customer-name')).toHaveText('John Carter');
});
