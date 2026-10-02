// Challenge #50 (intermediate) — iFrame: Payment Gateway
// Objective: Enter payment details inside the iframe and submit.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('fill iframe payment form', async ({ page }) => {
  await page.goto('/lab/iframes');
  const frame = page.frameLocator('[data-testid="payment-frame"]');
  await frame.getByLabel('Card Number').fill('4111111111111111');
  await frame.getByLabel('Expiry Date').fill('12/29');
  await frame.getByLabel('CVV').fill('123');
  await frame.getByLabel('Name', { exact: true }).fill('John Carter');
  await frame.getByRole('button', { name: 'Pay Now' }).click();
  await expect(frame.getByText('Payment details accepted for card ending 1111')).toBeVisible();
  await expect(page.getByTestId('parent-frame-message')).toContainText(/AUTH-\d{6}/);
});
