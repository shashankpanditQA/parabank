// Challenge #77 (advanced) — Add a Request Header
// Objective: Add "x-test-run: pw-77" to the echo request and verify the server received it.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('inject header', async ({ page }) => {
  await page.route('**/api/lab/echo', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-test-run': 'pw-77' } }),
  );
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Send Echo Request' }).click();
  await expect(page.getByTestId('echo-custom-header')).toHaveText('x-test-run: pw-77');
});
