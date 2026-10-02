// Challenge #16 (beginner) — Select a Biller (Dropdown)
// Objective: Select "Electricity" in the Biller dropdown.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('select biller', async ({ page }) => {
  await page.goto('/payments');
  const biller = page.getByLabel('Biller');
  await biller.selectOption('Electricity');
  await expect(biller).toHaveValue('Electricity');
});
