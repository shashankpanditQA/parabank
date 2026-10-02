// Challenge #54 (intermediate) — Download an Account Statement
// Objective: Download the statement and validate the file name and that it is a PDF.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john
import fs from 'node:fs';

test('download statement', async ({ page }) => {
  await page.goto('/lab/download');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Account Statement' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^statement-CHK-\d{6}-\d{4}-\d{2}\.pdf$/);
  const file = await download.path();
  expect(fs.readFileSync(file!).subarray(0, 5).toString()).toBe('%PDF-');
});
