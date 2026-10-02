// Challenge #25 (beginner) — Unauthorized Page
// Objective: As john, open /admin and verify the Unauthorized (403) page.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('customer cannot open admin', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/unauthorized/);
  await expect(page.getByRole('heading', { name: 'Unauthorized' })).toBeVisible();
  await expect(page.getByTestId('unauthorized-page')).toContainText('403');
  await expect(page.getByTestId('unauthorized-page')).toContainText('CUSTOMER');
});
