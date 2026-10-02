// Challenge #87 (expert) — Balance Consistency
// Objective: Read balances via the API, transfer through the UI, and verify both balances and the dashboard.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

const balance = async (page: any, id: string) => (await (await page.request.get('/api/accounts/' + id)).json()).data.currentBalance as number;
const round = (n: number) => Math.round(n * 100) / 100;

test('balances stay consistent', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 1;
  const chkBefore = await balance(page, 'CHK-102938');
  const savBefore = await balance(page, 'SAV-827364');
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  expect(body).toMatchObject({ fromAccount: 'CHK-102938', toAccount: 'SAV-827364' });

  expect(await balance(page, 'CHK-102938')).toBe(round(chkBefore - amount));
  expect(await balance(page, 'SAV-827364')).toBe(round(savBefore + amount));
  await page.goto('/dashboard');
  const expected = (chkBefore - amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(page.getByTestId('checking-balance')).toContainText(expected);
});
