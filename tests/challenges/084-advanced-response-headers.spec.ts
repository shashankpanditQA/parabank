// Challenge #84 (advanced) — Response Headers
// Objective: Validate X-Request-Id, X-Response-Time, Content-Type and Cache-Control.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('response headers', async ({ page }) => {
  const res = page.waitForResponse('**/api/accounts');
  await page.goto('/accounts');
  const headers = (await res).headers();
  expect(headers['x-request-id']).toMatch(/^REQ-[0-9A-F]{8}$/);
  expect(headers['x-response-time']).toMatch(/^[\d.]+ms$/);
  expect(headers['content-type']).toContain('application/json');
  expect(headers['cache-control']).toBe('no-store');
});
