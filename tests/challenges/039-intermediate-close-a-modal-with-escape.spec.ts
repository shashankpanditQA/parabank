// Challenge #39 (intermediate) — Close a Modal with Escape
// Objective: Open the new-account modal and close it with the Escape key.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('escape closes modal', async ({ page }) => {
  await page.goto('/accounts');
  const rows = page.getByTestId('account-row');
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();
  await page.getByRole('button', { name: 'Open New Account' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(rows).toHaveCount(before);
});
