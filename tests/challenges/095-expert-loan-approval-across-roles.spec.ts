// Challenge #95 (expert) — Loan Approval Across Roles
// Objective: Apply for a loan via API as john, approve it in the admin UI, and verify john's view.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('admin approves john\'s loan', async ({ page, browser, baseURL }) => {
  const applied = await (await page.request.post('/api/loans', {
    data: { loanType: 'Personal Loan', requestedAmount: 5000, tenure: 24, employmentType: 'Salaried', monthlyIncome: 9000, existingEmi: 0, purpose: 'Home office equipment' },
  })).json();
  expect(applied.status).toBe('UNDER_REVIEW');

  const adminCtx = await browser.newContext({ baseURL });
  const admin = await adminCtx.newPage();
  await admin.request.post('/api/auth/login', { data: { username: 'admin', password: 'Admin@123' } });
  await admin.goto('/admin/loans');
  await admin.getByRole('tab', { name: 'Under Review' }).click();
  const row = admin.getByTestId('loan-row').filter({ hasText: applied.applicationId });
  admin.once('dialog', async (d) => {
    expect(d.message()).toContain(applied.applicationId);
    await d.accept();
  });
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByTestId('success-toast')).toContainText('Loan approved');
  await adminCtx.close();

  const loan = await (await page.request.get('/api/loans/' + applied.applicationId)).json();
  expect(loan.data.status).toBe('APPROVED');
  await page.goto('/notifications');
  await expect(page.getByTestId('notification-item').filter({ hasText: applied.applicationId }).first()).toContainText('approved');
});
