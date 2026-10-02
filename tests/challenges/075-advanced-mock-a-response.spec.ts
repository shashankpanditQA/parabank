// Challenge #75 (advanced) — Mock a Response
// Objective: Mock GET /api/accounts with a single "MOCK-000001" account worth $1,000,000.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('mock accounts', async ({ page }) => {
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: { success: true, count: 1, data: [{ accountNumber: 'MOCK-000001', accountType: 'SAVINGS', currentBalance: 1_000_000, availableBalance: 1_000_000, currency: 'USD', status: 'ACTIVE' }] },
    }),
  );
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  const accounts = page.getByTestId('network-account');
  await expect(accounts).toHaveCount(1);
  await expect(accounts).toContainText('MOCK-000001');
  await expect(accounts).toContainText('$1,000,000.00');
});
