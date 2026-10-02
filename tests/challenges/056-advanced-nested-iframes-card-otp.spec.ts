// Challenge #56 (advanced) — Nested iFrames: Card → OTP
// Objective: Enter card details, then the OTP inside the nested iframe, accept the confirmation and verify success.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('nested iframe OTP payment', async ({ page }) => {
  await page.goto('/lab/iframes');
  const pay = page.frameLocator('[data-testid="nested-payment-frame"]');
  await pay.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await pay.getByLabel('Expiry Date').fill('12/29');
  await pay.getByLabel('CVV').fill('123');
  await pay.getByLabel('Name on Card').fill('JOHN CARTER');
  await pay.getByRole('button', { name: 'Pay Now' }).click();
  const otp = pay.frameLocator('[data-testid="otp-frame"]');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('$180.00');
    await dialog.accept();
  });
  await otp.getByLabel('Enter OTP').fill('123456');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(pay.getByText('Payment Successful')).toBeVisible();
  await expect(pay.getByTestId('payment-id')).toHaveText(/^PAY-\d{6}$/);
});
