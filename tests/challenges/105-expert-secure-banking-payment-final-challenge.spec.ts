// Challenge #105 (expert) — Secure Banking Payment (Final Challenge)
// Objective: Automate the complete secure payment flow and validate every layer.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('Challenge #105 — Secure Banking Payment', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Dashboard → Transfer Money
  await page.getByRole('button', { name: 'Transfer Money' }).click();
  await expect(page).toHaveURL(/\/transfers/);

  // 3. Dynamic payment data
  const merchant = 'PW Store ' + Date.now();
  const amount = Math.round((150 + Math.random() * 300) * 100) / 100;
  await page.getByLabel('Merchant').fill(merchant);
  await page.getByLabel('Payment Amount').fill(amount.toFixed(2));

  // 4. New popup
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Secure Payment Gateway' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup.getByRole('heading', { name: 'Secure Payment Gateway' })).toBeVisible();

  // 5. Payment iframe → card details
  const payment = popup.frameLocator('[data-testid="payment-frame"]');
  await payment.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await payment.getByLabel('Expiry Date').fill('12/29');
  await payment.getByLabel('CVV').fill('123');
  await payment.getByLabel('Name on Card').fill('JOHN CARTER');
  await payment.getByRole('button', { name: 'Pay Now' }).click();

  // 6. Nested OTP iframe
  const otp = payment.frameLocator('[data-testid="otp-frame"]');
  await otp.getByLabel('Enter OTP').fill('123456');

  // 7. Confirm dialog + API response
  popup.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain(merchant);
    expect(dialog.message()).toContain('card ending 1111');
    await dialog.accept();
  });
  const responsePromise = popup.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  const response = await responsePromise;

  // 8. JSON validation
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({ success: true, status: 'SUCCESS', merchant, amount, cardLast4: '1111', channel: 'GATEWAY' });
  expect(body.paymentId).toMatch(/^PAY-\d{6}$/);
  expect(body.transactionId).toMatch(/^TXN-\d{6}$/);
  await expect(payment.getByTestId('payment-id')).toHaveText(body.paymentId);

  // 9. Database update
  const db = await (await page.request.get('/api/lab/db/payments?id=' + body.paymentId)).json();
  expect(db.rows[0]).toMatchObject({ id: body.paymentId, transaction_id: body.transactionId, amount, status: 'SUCCESS', card_last4: '1111' });

  // 10. Main window: success toast + transaction table
  await expect(page.getByTestId('success-toast').filter({ hasText: 'Payment Successful' })).toContainText(body.paymentId);
  const row = page.getByTestId('latest-transactions').getByTestId('transaction-row').filter({ hasText: body.transactionId });
  await expect(row).toContainText('Gateway Payment - ' + merchant);
  await expect(row).toContainText('-$' + amount.toFixed(2));
  await expect(row).toContainText('Completed');
});
