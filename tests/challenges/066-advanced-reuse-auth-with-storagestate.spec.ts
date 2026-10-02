// Challenge #66 (advanced) — Reuse Auth with storageState
// Objective: Save storageState after a UI login and open the dashboard in a fresh context without logging in.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('reuse storage state', async ({ browser, baseURL }) => {
  const ctx1 = await browser.newContext({ baseURL });
  const page1 = await ctx1.newPage();
  await page1.goto('/login');
  await page1.getByLabel('Username').fill('john');
  await page1.getByLabel('Password').fill('Demo@123');
  await page1.getByRole('button', { name: 'Login' }).click();
  await expect(page1).toHaveURL(/\/dashboard/);
  const state = await ctx1.storageState({ path: 'test-results/john-state.json' });
  expect(state.cookies.find((c) => c.name === 'pb_session')).toBeTruthy();

  const ctx2 = await browser.newContext({ baseURL, storageState: 'test-results/john-state.json' });
  const page2 = await ctx2.newPage();
  await page2.goto('/dashboard');
  await expect(page2.getByRole('heading', { name: 'Welcome back, John' })).toBeVisible();
  await ctx1.close();
  await ctx2.close();
});
