// Challenge #94 (expert) — Customer vs Admin
// Objective: As admin, disable olivia in the UI, verify her login fails with ACCOUNT_DISABLED, then re-enable her.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

test('admin disables a customer', async ({ page, playwright, baseURL }) => {
  await page.request.post('/api/auth/login', { data: { username: 'admin', password: 'Admin@123' } });
  const api = await playwright.request.newContext({ baseURL });
  try {
    await page.goto('/admin/customers');
    await page.getByLabel('Search Customers').fill('Olivia');
    const row = page.getByTestId('customer-row').filter({ hasText: 'Olivia Brown' });
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Disable' }).click();
    await expect(row.getByText('DISABLED')).toBeVisible();

    const blocked = await api.post('/api/auth/login', { data: { username: 'olivia', password: 'Demo@123' } });
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).errorCode).toBe('ACCOUNT_DISABLED');

    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Enable' }).click();
    await expect(row.getByText('ACTIVE')).toBeVisible();
    expect((await api.post('/api/auth/login', { data: { username: 'olivia', password: 'Demo@123' } })).status()).toBe(200);
  } finally {
    const customers = await (await page.request.get('/api/admin/customers?search=olivia')).json();
    await page.request.patch('/api/admin/customers/' + customers.data[0].customerId + '/status', { data: { status: 'ACTIVE' } });
    await api.dispose();
  }
});
