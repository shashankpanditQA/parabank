// Challenge #40 (intermediate) — Add a Beneficiary (Toast)
// Objective: Add a beneficiary with unique data and validate the toast and the new row.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('add beneficiary', async ({ page }) => {
  const name = 'PW Payee ' + Date.now();
  const account = String(Date.now()).slice(-12);
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Account Number').fill(account);
  await dialog.getByLabel('Bank').selectOption('Chase Bank');
  await dialog.getByLabel('IFSC').fill('CHAS0123456');
  await dialog.getByLabel('Nickname').fill('PW');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  const toast = page.getByTestId('success-toast');
  await expect(toast).toContainText('Beneficiary added');
  await expect(toast).toContainText(/BEN-\d{6}/);
  await expect(page.getByTestId('beneficiary-row').filter({ hasText: name })).toBeVisible();
});
