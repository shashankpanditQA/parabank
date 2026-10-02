// Challenge #57 (advanced) — Locate a Frame by URL
// Objective: Find the iframe pointing to /payment-gateway?mode=simple, pay, and validate the API response.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('frame by URL', async ({ page }) => {
  await page.goto('/lab/iframes');
  await expect.poll(() => page.frame({ url: /\/payment-gateway\?mode=simple/ })).not.toBeNull();
  const frame = page.frame({ url: /\/payment-gateway\?mode=simple/ });
  await frame!.getByLabel('Card Number').fill('4111111111111111');
  await frame!.getByLabel('Expiry Date').fill('11/30');
  await frame!.getByLabel('CVV').fill('321');
  await frame!.getByLabel('Name on Card').fill('JOHN CARTER');
  const res = page.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await frame!.getByRole('button', { name: 'Pay Now' }).click();
  const response = await res;
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({ success: true, merchant: 'Lab Coffee Shop', amount: 49.99, channel: 'GATEWAY' });
});
