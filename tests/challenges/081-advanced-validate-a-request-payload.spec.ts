// Challenge #81 (advanced) — Validate a Request Payload
// Objective: Pay an Electricity bill and validate the POST /api/payments payload.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('payment payload', async ({ page }) => {
  await page.goto('/payments');
  await page.getByLabel('Biller').selectOption('Electricity');
  await page.getByLabel('Customer Number').fill('ELE123456');
  await page.getByLabel('Amount').fill('42.50');
  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/payments') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Pay Bill' }).click();
  const payload = (await requestPromise).postDataJSON();
  expect(payload).toMatchObject({ biller: 'Electricity', customerNumber: 'ELE123456' });
  expect(Number(payload.amount)).toBe(42.5);
  expect(payload.accountId).toMatch(/^(CHK|SAV|CRD)-\d{6}$/);
  await expect(page.getByTestId('payment-id')).toHaveText(/^PAY-\d{6}$/);
});
