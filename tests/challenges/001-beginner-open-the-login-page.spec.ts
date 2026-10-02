// Challenge #1 (beginner) — Open the Login Page
// Objective: Navigate to /login and verify the page title and the "Welcome back" heading.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/ParaBank Pro/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
});
