// Challenge #67 (advanced) — Inspect Session Cookies
// Objective: Verify the pb_session cookie after login and its removal after logout.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('session cookie', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const session = (await context.cookies()).find((c) => c.name === 'pb_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.value).toMatch(/^SES-\d{6}-[0-9a-f]{16}$/);
  expect(await page.evaluate(() => document.cookie)).not.toContain('pb_session');

  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await context.cookies()).find((c) => c.name === 'pb_session')).toBeUndefined();
});
