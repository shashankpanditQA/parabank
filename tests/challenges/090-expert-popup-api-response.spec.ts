// Challenge #90 (expert) — Popup + API Response
// Objective: Capture the popup, submit payment, capture the API response and validate the JSON.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('popup payment API', async ({ page }) => {
  await page.goto('/lab/workflows');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Payment Gateway' }).click();
  const popup = await popupPromise;
  const payment = popup.frameLocator('[data-testid="payment-frame"]');
  await payment.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await payment.getByLabel('Expiry Date').fill('12/29');
  await payment.getByLabel('CVV').fill('123');
  await payment.getByLabel('Name on Card').fill('JOHN CARTER');
  await payment.getByRole('button', { name: 'Pay Now' }).click();
  const otp = payment.frameLocator('[data-testid="otp-frame"]');
  await otp.getByLabel('Enter OTP').fill('123456');
  popup.once('dialog', (d) => d.accept());
  const responsePromise = popup.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({ success: true, status: 'SUCCESS', amount: 320.75, merchant: 'Workflow Travel Agency', cardLast4: '1111', channel: 'GATEWAY' });
  expect(body.paymentId).toMatch(/^PAY-\d{6}$/);
  await expect(page.getByTestId('api-response-body').first()).toContainText(body.paymentId);
});
