// Challenge #42 (intermediate) — Duplicate Beneficiary
// Objective: Try to add a beneficiary with an existing account number.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('duplicate beneficiary', async ({ page }) => {
  const list = await (await page.request.get('/api/beneficiaries')).json();
  const existing = list.data[0];
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill('Duplicate Person');
  await dialog.getByLabel('Account Number').fill(existing.accountNumber);
  await dialog.getByLabel('Bank').selectOption('Wells Fargo');
  await dialog.getByLabel('IFSC').fill('WFBI0123456');
  const res = page.waitForResponse((r) => r.url().endsWith('/api/beneficiaries') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  expect((await res).status()).toBe(409);
  expect((await (await res).json()).errorCode).toBe('DUPLICATE_BENEFICIARY');
  await expect(dialog.getByTestId('beneficiary-form-error')).toHaveText('A beneficiary with this account number already exists.');
});
