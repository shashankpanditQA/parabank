// Challenge #92 (expert) — Dismiss Means No Request
// Objective: Dismiss the delete confirmation and prove that no DELETE request was made.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('dismiss sends nothing', async ({ page }) => {
  const name = 'No Delete ' + Date.now();
  const created = await (await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-10), bank: 'ICICI Bank', ifsc: 'ICIC0004321' },
  })).json();
  const deletes: string[] = [];
  page.on('request', (r) => { if (r.method() === 'DELETE') deletes.push(r.url()); });
  await page.goto('/beneficiaries');
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('beneficiary-row').filter({ hasText: name }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('info-toast')).toContainText('Delete cancelled');
  expect(deletes).toHaveLength(0);
  expect((await page.request.get('/api/beneficiaries/' + created.id)).status()).toBe(200);
});
