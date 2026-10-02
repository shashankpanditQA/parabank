// Challenge #43 (intermediate) — Edit a Beneficiary
// Objective: Change a beneficiary nickname and verify the update.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('edit beneficiary nickname', async ({ page }) => {
  const name = 'Edit Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-11), bank: 'Citibank', ifsc: 'CITI0123456', nickname: 'Old' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Beneficiary' });
  await expect(dialog.getByLabel('Nickname')).toHaveValue('Old');
  await dialog.getByLabel('Nickname').fill('New Nick');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByTestId('success-toast')).toContainText('Beneficiary updated');
  await expect(row).toContainText('New Nick');
});
