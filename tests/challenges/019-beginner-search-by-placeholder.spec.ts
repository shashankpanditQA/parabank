// Challenge #19 (beginner) — Search by Placeholder
// Objective: Search transactions for "Netflix" using getByPlaceholder().
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('search by placeholder', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByPlaceholder('Search by description, ID or reference').fill('Netflix');
  await expect(page).toHaveURL(/search=Netflix/);
  await expect(page.getByTestId('transaction-row').first()).toContainText('Netflix');
});
