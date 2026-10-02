// Challenge #85 (advanced) — Download and Parse a CSV
// Objective: Download the failed-transactions CSV and verify every row is Failed and the count matches the API.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john
import fs from 'node:fs';

test('failed transactions CSV', async ({ page }) => {
  await page.goto('/lab/download');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Failed Transactions' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^transaction-report-\d{4}-\d{2}-\d{2}\.csv$/);
  const lines = fs.readFileSync((await download.path())!, 'utf8').trim().split('\n');
  expect(lines[0]).toBe('Transaction ID,Date,Description,Type,Amount,Direction,Account,Status,Balance After');
  const rows = lines.slice(1);
  for (const row of rows) expect(row).toContain(',Failed,');
  const api = await (await page.request.get('/api/transactions?status=Failed&pageSize=1')).json();
  expect(rows).toHaveLength(api.pagination.total);
});
