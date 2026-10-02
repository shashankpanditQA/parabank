// Challenge #6 (beginner) — Empty Password
// Objective: Submit with only a username and verify "Password is required".
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('empty password', async ({ page }) => {
  let loginCalls = 0;
  page.on('request', (r) => { if (r.url().includes('/api/auth/login')) loginCalls++; });
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Password is required')).toBeVisible();
  expect(loginCalls).toBe(0);
});
