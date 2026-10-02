// Challenge #53 (intermediate) — Upload an Invalid File Type
// Objective: Upload sample-files/invalid-file.txt and verify the error.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('reject invalid file type', async ({ page }) => {
  await page.goto('/lab/upload');
  const card = page.getByTestId('upload-address-proof');
  await page.getByLabel('Upload Address Proof').setInputFiles('sample-files/invalid-file.txt');
  const res = page.waitForResponse('**/api/documents');
  await card.getByRole('button', { name: 'Upload', exact: true }).click();
  expect((await res).status()).toBe(415);
  await expect(card.getByRole('alert')).toContainText('Upload a PDF, PNG or JPG.');
});
