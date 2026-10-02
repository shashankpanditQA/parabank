// Challenge #12 (beginner) — Sidebar Navigation
// Objective: Click "Accounts" in the main navigation and verify the Accounts page.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('sidebar navigation', async ({ page }) => {
  await page.goto('/dashboard');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Accounts' })).toBeVisible();
});
