// Challenge #69 (advanced) — Session Expiration
// Objective: Use "Expire Session" in the lab and verify the redirect and message.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('expired session redirects to login', async ({ page }) => {
  await page.goto('/lab');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Expire Session' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('session-message')).toHaveText('Your session has expired. Please log in again.');
  const res = await page.request.get('/api/accounts');
  expect(res.status()).toBe(401);
  expect((await res.json()).errorCode).toBe('SESSION_EXPIRED');
});
