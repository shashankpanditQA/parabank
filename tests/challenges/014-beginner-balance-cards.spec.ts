// Challenge #14 (beginner) — Balance Cards
// Objective: Verify each balance card is visible and shows a dollar amount.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('balance cards', async ({ page }) => {
  await page.goto('/dashboard');
  for (const id of ['total-balance', 'checking-balance', 'savings-balance', 'credit-balance']) {
    await expect(page.getByTestId(id)).toContainText(/\$[\d,]+\.\d{2}/);
  }
});
