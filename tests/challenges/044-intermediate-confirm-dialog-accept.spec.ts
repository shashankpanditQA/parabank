// Challenge #44 (intermediate) — Confirm Dialog: Accept
// Objective: Verify the beneficiary name appears in the confirmation dialog, accept it, and verify the row is gone.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('delete beneficiary (accept)', async ({ page }) => {
  const name = 'Delete Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-10), bank: 'Capital One', ifsc: 'CAPO0123456' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Are you sure you want to delete this beneficiary?');
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByTestId('success-toast')).toContainText('Beneficiary deleted');
});
