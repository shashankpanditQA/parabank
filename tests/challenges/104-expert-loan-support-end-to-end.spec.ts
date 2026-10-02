// Challenge #104 (expert) — Loan + Support End-to-End
// Objective: Complete both flows through the UI and verify their side effects.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

test('loan and support E2E', async ({ page }) => {
  await page.goto('/loans');
  await page.getByLabel('Loan Type').selectOption('Car Loan');
  await page.getByLabel('Requested Amount').fill('20000');
  await page.getByLabel('Tenure (months)').fill('48');
  await page.getByLabel('Employment Type').selectOption('Salaried');
  await page.getByLabel('Monthly Income').fill('9000');
  await page.getByLabel('Existing EMI').fill('0');
  await page.getByLabel('Purpose').fill('New family car');
  await page.getByRole('button', { name: 'Submit Application' }).click();
  const loanId = await page.getByTestId('loan-application-id').textContent();
  expect(loanId).toMatch(/^LOAN-\d{6}$/);

  await page.goto('/support');
  await page.getByLabel('Category').selectOption('Loans');
  await page.getByLabel('Subject').fill('Question about ' + loanId);
  await page.getByLabel('Description').fill('Please confirm the documents required for my car loan.');
  await page.getByLabel('High').check();
  await page.getByLabel('Attachment').setInputFiles('sample-files/income-proof.jpg');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByTestId('ticket-id')).toHaveText(/^TKT-\d{6}$/);
  await expect(page.getByTestId('ticket-row').filter({ hasText: loanId! })).toContainText('income-proof.jpg');

  await page.goto('/notifications');
  await expect(page.getByTestId('notification-item').filter({ hasText: loanId! })).toContainText('under review');
});
