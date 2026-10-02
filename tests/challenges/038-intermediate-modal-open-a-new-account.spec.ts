// Challenge #38 (intermediate) — Modal: Open a New Account
// Objective: Open a Savings account named "Vacation Fund" and verify it appears in the table.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('open savings account', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Open New Account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Open New Account' });
  await dialog.getByLabel('Savings').check();
  await dialog.getByLabel('Nickname').fill('Vacation Fund');
  await dialog.getByRole('button', { name: 'Open Account' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('success-toast')).toContainText('Account opened');
  await expect(page.getByTestId('account-row').filter({ hasText: 'Vacation Fund' }).first()).toBeVisible();
});
