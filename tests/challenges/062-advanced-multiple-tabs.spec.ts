// Challenge #62 (advanced) — Multiple Tabs
// Objective: Open the Transactions and Support tabs, switch between them and validate content.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('switch between tabs', async ({ page, context }) => {
  await page.goto('/lab/tabs');
  const txPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open Transactions' }).click();
  const txTab = await txPromise;
  await txTab.waitForLoadState();

  await page.bringToFront();
  const supportPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open Support' }).click();
  const supportTab = await supportPromise;

  await txTab.bringToFront();
  await expect(txTab).toHaveURL(/\/transactions/);
  await expect(txTab.getByTestId('transaction-table')).toBeVisible();
  await supportTab.bringToFront();
  await expect(supportTab.getByRole('heading', { level: 1, name: 'Support Tickets' })).toBeVisible();
  expect(context.pages()).toHaveLength(3);
});
