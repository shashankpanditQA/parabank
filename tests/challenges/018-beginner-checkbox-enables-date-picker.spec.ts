// Challenge #18 (beginner) — Checkbox Enables Date Picker
// Objective: Verify the date input is disabled, check the box, then fill a date.
// Generated from challenges/beginner/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('schedule checkbox enables date', async ({ page }) => {
  await page.goto('/transfers');
  const date = page.getByLabel('Transfer Date');
  await expect(date).toBeDisabled();
  await page.getByLabel('Schedule Transfer').check();
  await expect(date).toBeEnabled();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await date.fill(tomorrow);
  await expect(date).toHaveValue(tomorrow);
});
