// Challenge #93 (expert) — Multiple Users
// Objective: john adds a beneficiary; sarah must not see it.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

async function userPage(browser: any, baseURL: string | undefined, username: string) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const res = await page.request.post('/api/auth/login', { data: { username, password: 'Demo@123' } });
  expect(res.ok()).toBeTruthy();
  return { context, page };
}

test('beneficiaries are private per customer', async ({ browser, baseURL }) => {
  const john = await userPage(browser, baseURL, 'john');
  const sarah = await userPage(browser, baseURL, 'sarah');
  const name = 'Private ' + Date.now();
  await john.page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-12), bank: 'Chase Bank', ifsc: 'CHAS0111111' },
  });
  await john.page.goto('/beneficiaries');
  await expect(john.page.getByTestId('beneficiary-row').filter({ hasText: name })).toBeVisible();

  await sarah.page.goto('/beneficiaries');
  await sarah.page.getByLabel('Search beneficiaries').fill(name);
  await expect(sarah.page.getByTestId('empty-state')).toContainText('No beneficiaries found');
  await john.context.close();
  await sarah.context.close();
});
