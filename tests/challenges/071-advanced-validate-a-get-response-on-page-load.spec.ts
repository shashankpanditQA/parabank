// Challenge #71 (advanced) — Validate a GET Response on Page Load
// Objective: Validate GET /api/accounts and compare it with the rendered rows.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('accounts response shape', async ({ page }) => {
  const res = page.waitForResponse('**/api/accounts');
  await page.goto('/accounts');
  const body = await (await res).json();
  expect(body.success).toBe(true);
  for (const a of body.data) {
    expect(a).toEqual(expect.objectContaining({
      accountNumber: expect.stringMatching(/^(CHK|SAV|CRD)-\d{6}$/),
      accountType: expect.stringMatching(/^(CHECKING|SAVINGS|CREDIT)$/),
      currency: 'USD',
      status: 'ACTIVE',
      currentBalance: expect.any(Number),
    }));
  }
  await expect(page.getByTestId('account-row')).toHaveCount(body.data.length);
});
