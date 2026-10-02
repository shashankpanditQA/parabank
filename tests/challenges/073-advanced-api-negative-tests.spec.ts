// Challenge #73 (advanced) — API Negative Tests
// Objective: Check INVALID_OTP (400), INSUFFICIENT_BALANCE (422) and INVALID_ACCOUNT (404).
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

const cases = [
  { name: 'invalid OTP', body: { amount: 5, otp: '000000' }, status: 400, code: 'INVALID_OTP' },
  { name: 'insufficient', body: { amount: 999999, otp: '123456' }, status: 422, code: 'INSUFFICIENT_BALANCE' },
  { name: 'invalid account', body: { amount: 5, otp: '123456', toAccount: 'SAV-000000' }, status: 404, code: 'INVALID_ACCOUNT' },
];

for (const c of cases) {
  test('transfer error: ' + c.name, async ({ page }) => {
    const res = await page.request.post('/api/transfers', {
      data: { fromAccount: 'CHK-102938', toAccount: 'SAV-827364', ...c.body },
    });
    expect(res.status()).toBe(c.status);
    expect(await res.json()).toMatchObject({ success: false, errorCode: c.code });
  });
}
