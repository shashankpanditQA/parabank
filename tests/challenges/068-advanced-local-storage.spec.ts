// Challenge #68 (advanced) — Local Storage
// Objective: Read and assert localStorage values after logging in with Remember Me.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('local storage', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByLabel('Remember Me').check();
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const storage = await page.evaluate(() => ({
    user: JSON.parse(localStorage.getItem('parabank.user') ?? 'null'),
    remembered: localStorage.getItem('parabank.rememberedUsername'),
  }));
  expect(storage.user).toMatchObject({ username: 'john', role: 'CUSTOMER', customerId: expect.stringMatching(/^CUS-/) });
  expect(storage.remembered).toBe('john');
});
