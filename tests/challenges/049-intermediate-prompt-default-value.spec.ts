// Challenge #49 (intermediate) — Prompt Default Value
// Objective: Verify dialog.defaultValue() and accept the default.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('prompt default value', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', async (dialog) => {
    expect(dialog.defaultValue()).toBe('TXN-REF-0001');
    await dialog.accept(dialog.defaultValue());
  });
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Reference saved: TXN-REF-0001');
});
