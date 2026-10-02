// Challenge #52 (intermediate) — Upload a KYC Document
// Objective: Upload sample-files/kyc-document.pdf and verify name, size and status.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('upload KYC document', async ({ page }) => {
  await page.goto('/lab/upload');
  const card = page.getByTestId('upload-kyc-document');
  await page.getByLabel('Upload KYC Document').setInputFiles('sample-files/kyc-document.pdf');
  await expect(card.getByTestId('selected-file')).toContainText('kyc-document.pdf');
  await card.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(card.getByTestId('upload-status')).toHaveText('kyc-document.pdf uploaded · VERIFIED');
  await expect(page.getByTestId('document-row').filter({ hasText: 'kyc-document.pdf' }).first()).toContainText('KYC Document');
});
