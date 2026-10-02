// Challenge #58 (advanced) — Two-Level Frame Tree
// Objective: Fill the ZIP in level 1 and book an appointment in level 2.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('two-level frames', async ({ page }) => {
  await page.goto('/lab/iframes');
  const level1 = page.frameLocator('[data-testid="level-1-frame"]');
  await level1.getByLabel('ZIP Code').fill('10001');
  const level2 = level1.frameLocator('[data-testid="level-2-frame"]');
  await level2.getByLabel('Appointment Date').fill('2026-12-01');
  await level2.getByRole('button', { name: 'Book Appointment' }).click();
  await expect(level2.getByText('Appointment booked for 2026-12-01')).toBeVisible();
});
