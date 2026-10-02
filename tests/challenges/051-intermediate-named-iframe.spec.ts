// Challenge #51 (intermediate) — Named iFrame
// Objective: Use page.frame({ name: "bank-payment-frame" }) to send money from the widget.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('named iframe', async ({ page }) => {
  await page.goto('/lab/iframes');
  // The SPA renders the iframe after page load, so poll until the frame is attached.
  await expect.poll(() => page.frame({ name: 'bank-payment-frame' })).not.toBeNull();
  const frame = page.frame({ name: 'bank-payment-frame' });
  await frame!.getByLabel('Beneficiary Name').fill('Alice Johnson');
  await frame!.getByLabel('Account Number').fill('123456789012');
  await frame!.getByLabel('Amount').fill('250');
  await frame!.getByLabel('Speed').selectOption('instant');
  await frame!.getByLabel('Receiver').check();
  await frame!.getByRole('button', { name: 'Send Money' }).click();
  await expect(frame!.getByTestId('widget-confirmation')).toContainText('$250.00 to Alice Johnson (instant, fee paid by receiver)');
});
