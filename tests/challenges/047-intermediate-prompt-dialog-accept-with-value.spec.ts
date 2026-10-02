// Challenge #47 (intermediate) — Prompt Dialog: Accept with Value
// Objective: Enter "PAYMENT-12345" in the transaction reference prompt.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('prompt accept', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toBe('Enter transaction reference');
    await dialog.accept('PAYMENT-12345');
  });
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Reference saved: PAYMENT-12345');
});
