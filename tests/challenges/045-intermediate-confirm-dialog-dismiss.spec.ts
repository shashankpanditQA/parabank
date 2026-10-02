// Challenge #45 (intermediate) — Confirm Dialog: Dismiss
// Objective: Dismiss the confirmation and verify nothing was deleted.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('delete beneficiary (dismiss)', async ({ page }) => {
  const name = 'Keep Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-9), bank: 'Chase Bank', ifsc: 'CHAS0654321' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });
  page.once('dialog', (dialog) => dialog.dismiss());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('info-toast')).toContainText('Delete cancelled');
  await expect(row).toBeVisible();
});
