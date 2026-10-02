// Challenge #89 (expert) — Popup + iFrame + Nested OTP
// Objective: Complete the gateway checkout opened from Advanced Workflows.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('popup checkout with nested OTP', async ({ page }) => {
  await page.goto('/lab/workflows');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Payment Gateway' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Secure Payment Gateway' })).toBeVisible();
  const payment = popup.frameLocator('[data-testid="payment-frame"]');
  await payment.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await payment.getByLabel('Expiry Date').fill('12/29');
  await payment.getByLabel('CVV').fill('123');
  await payment.getByLabel('Name on Card').fill('JOHN CARTER');
  await payment.getByRole('button', { name: 'Pay Now' }).click();
  const otp = payment.frameLocator('[data-testid="otp-frame"]');
  await otp.getByLabel('Enter OTP').fill('123456');
  popup.once('dialog', (d) => d.accept());
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(payment.getByText('Payment Successful')).toBeVisible();
  await expect(popup.getByText('Payment Complete')).toBeVisible();
});
