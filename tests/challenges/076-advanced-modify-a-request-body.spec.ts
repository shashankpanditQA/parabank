// Challenge #76 (advanced) — Modify a Request Body
// Objective: Change amount from 100 to 999 in the outgoing POST /api/lab/echo body.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('modify POST body', async ({ page }) => {
  await page.route('**/api/lab/echo', async (route) => {
    const original = route.request().postDataJSON();
    expect(original.amount).toBe(100);
    await route.continue({ postData: JSON.stringify({ ...original, amount: 999 }) });
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Send Echo Request' }).click();
  await expect(page.getByTestId('echo-result')).toContainText('"amount": 999');
});
