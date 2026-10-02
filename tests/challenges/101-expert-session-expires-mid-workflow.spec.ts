// Challenge #101 (expert) — Session Expires Mid-Workflow
// Objective: Expire the session via API just before Confirm and verify the redirect.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('session expires during transfer', async ({ page }) => {
  const before = (await (await page.request.get('/api/transfers')).json()).count;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(7.77.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  await page.request.post('/api/auth/expire-session');
  page.on('dialog', (d) => d.accept());
  const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const res = await responsePromise;
  expect(res.status()).toBe(401);
  expect((await res.json()).errorCode).toBe('SESSION_EXPIRED');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('session-message')).toContainText('session has expired');

  await page.request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
  expect((await (await page.request.get('/api/transfers')).json()).count).toBe(before);
});
