// Challenge #34 (intermediate) — Amount Range Filter
// Objective: Show transactions between $100 and $500 and verify each amount.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('amount range', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByLabel('Min Amount').fill('100');
  const res = page.waitForResponse((r) => r.url().includes('/api/transactions') && r.url().includes('maxAmount=500'));
  await page.getByLabel('Max Amount').fill('500');
  const body = await (await res).json();
  for (const t of body.data) {
    expect(t.amount).toBeGreaterThanOrEqual(100);
    expect(t.amount).toBeLessThanOrEqual(500);
  }
});
