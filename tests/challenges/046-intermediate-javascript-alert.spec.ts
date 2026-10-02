// Challenge #46 (intermediate) — JavaScript Alert
// Objective: Click "Transaction Alert", capture the alert and validate its message.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('transaction alert', async ({ page }) => {
  await page.goto('/lab/dialogs');
  const dialogPromise = page.waitForEvent('dialog');
  const click = page.getByRole('button', { name: 'Transaction Alert' }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('alert');
  expect(dialog.message()).toBe('Transaction submitted successfully');
  await dialog.accept();
  await click;
  await expect(page.getByTestId('dialog-result')).toHaveText('Transaction alert acknowledged');
});
