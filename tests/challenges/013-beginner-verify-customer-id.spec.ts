// Challenge #13 (beginner) — Verify Customer ID
// Objective: Verify the customer ID format and value.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('customer id on dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('customer-id')).toHaveText(/^CUS-\d{6}$/);
  await expect(page.getByTestId('customer-name')).toHaveText('John Carter');
});
