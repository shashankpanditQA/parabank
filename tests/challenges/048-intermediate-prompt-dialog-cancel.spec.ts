// Challenge #48 (intermediate) — Prompt Dialog: Cancel
// Objective: Dismiss the prompt and verify the cancellation message.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('prompt cancel', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Prompt cancelled');
});
