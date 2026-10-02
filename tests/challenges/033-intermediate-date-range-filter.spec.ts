// Challenge #33 (intermediate) — Date Range Filter
// Objective: Show the last 30 days of activity and verify every returned date is in range (via the API response).
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('date range', async ({ page }) => {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  await page.goto('/transactions');
  await page.getByLabel('From Date').fill(from);
  const res = page.waitForResponse((r) => r.url().includes('/api/transactions') && r.url().includes('toDate=' + to));
  await page.getByLabel('To Date').fill(to);
  const body = await (await res).json();
  expect(body.data.length).toBeGreaterThan(0);
  for (const t of body.data) {
    expect(t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to).toBe(true);
  }
  await expect(page.getByTestId('transaction-row')).toHaveCount(body.data.length);
});
