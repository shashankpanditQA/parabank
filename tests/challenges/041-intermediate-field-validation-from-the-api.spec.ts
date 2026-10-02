// Challenge #41 (intermediate) — Field Validation from the API
// Objective: Submit an invalid IFSC and verify the field error.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('invalid IFSC', async ({ page }) => {
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill('Invalid Ifsc');
  await dialog.getByLabel('Account Number').fill('123456789012');
  await dialog.getByLabel('Bank').selectOption('Citibank');
  await dialog.getByLabel('IFSC').fill('BAD123');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  await expect(dialog.getByText('IFSC must look like ABCD0123456')).toBeVisible();
  await expect(dialog).toBeVisible();
});
