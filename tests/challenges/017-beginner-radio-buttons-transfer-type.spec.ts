// Challenge #17 (beginner) — Radio Buttons: Transfer Type
// Objective: Select the "Beneficiary" radio and verify the Beneficiary dropdown replaces "To Account".
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('transfer type radio', async ({ page }) => {
  await page.goto('/transfers');
  await expect(page.getByRole('combobox', { name: 'To Account' })).toBeVisible();
  await page.getByRole('radio', { name: 'Beneficiary' }).check();
  await expect(page.getByRole('radio', { name: 'Beneficiary' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Beneficiary' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'To Account' })).toBeHidden();
});
