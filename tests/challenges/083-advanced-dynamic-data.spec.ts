// Challenge #83 (advanced) — Dynamic Data
// Objective: Load FX rates twice and verify the quote IDs differ but follow the pattern.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('dynamic fx quote', async ({ page }) => {
  await page.goto('/lab/network');
  const load = page.getByRole('button', { name: 'Load FX Rates' });
  const quote = page.getByTestId('fx-quote-id');
  await load.click();
  await expect(quote).toHaveText(/^FX-\d{6}$/);
  const first = await quote.textContent();
  await load.click();
  await expect(quote).not.toHaveText(first!);
  await expect(quote).toHaveText(/^FX-\d{6}$/);
  const eur = Number(await page.getByTestId('fx-EUR').textContent());
  expect(eur).toBeGreaterThan(0.8);
  expect(eur).toBeLessThan(1.1);
});
