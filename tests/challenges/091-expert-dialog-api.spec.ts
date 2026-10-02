// Challenge #91 (expert) — Dialog + API
// Objective: Validate the dialog, the DELETE response and that the record is really gone.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('dialog then API delete', async ({ page }) => {
  const name = 'Dialog Api ' + Date.now();
  const created = await (await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-12), bank: 'HDFC Bank', ifsc: 'HDFC0001234' },
  })).json();
  await page.goto('/beneficiaries');
  page.once('dialog', async (d) => {
    expect(d.message()).toContain(name);
    await d.accept();
  });
  const del = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().endsWith('/api/beneficiaries/' + created.id));
  await page.getByTestId('beneficiary-row').filter({ hasText: name }).getByRole('button', { name: 'Delete' }).click();
  const res = await del;
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ success: true, id: created.id, name });
  const list = await (await page.request.get('/api/beneficiaries')).json();
  expect(list.data.map((b: any) => b.id)).not.toContain(created.id);
});
