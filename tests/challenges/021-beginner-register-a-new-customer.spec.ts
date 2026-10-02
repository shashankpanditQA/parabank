// Challenge #21 (beginner) — Register a New Customer
// Objective: Register with a unique username, then log in with it.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('register new customer', async ({ page }) => {
  const username = 'pw_' + Date.now().toString(36);
  await page.goto('/register');
  await page.getByLabel('First Name').fill('Ada');
  await page.getByLabel('Last Name').fill('Lovelace');
  await page.getByLabel('Email').fill(username + '@example.com');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('Secret123');
  await page.getByLabel('Confirm Password').fill('Secret123');
  await page.getByLabel('I accept the terms and conditions').check();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByTestId('success-toast')).toContainText('Registration successful');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('Secret123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Ada' })).toBeVisible();
});
