// Challenge #60 (advanced) — Popup: Accept the Bank Policy
// Objective: Open the Bank Policy, tick the acceptance checkbox and acknowledge.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('acknowledge policy in popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Bank Policy' }).click();
  const policy = await popupPromise;
  const ack = policy.getByRole('button', { name: 'Acknowledge' });
  await expect(ack).toBeDisabled();
  await policy.getByLabel('I have read and accept the bank policy').check();
  await expect(ack).toBeEnabled();
  await ack.click();
  await expect(policy.getByText(/Policy acknowledged on/)).toBeVisible();
});
