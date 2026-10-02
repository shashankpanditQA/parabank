import { test, expect, randomAmount } from '../fixtures/auth';

test.describe('UI + API + Database', () => {
  test('bill payment flows from form to API to database to table', async ({ page }) => {
    const amount = randomAmount(10, 80);
    await page.goto('/payments');
    await page.getByLabel('Biller').selectOption('Internet');
    await page.getByLabel('Customer Number').fill('INT445566');
    await page.getByLabel('Amount').fill(amount.toFixed(2));
    const resPromise = page.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Pay Bill' }).click();
    await expect(page.getByText('Processing Payment...')).toBeVisible();
    const res = await resPromise;
    expect(res.status()).toBe(201);
    const body = await res.json();

    await expect(page.getByTestId('payment-id')).toHaveText(body.paymentId);
    await expect(page.getByTestId('api-response-status')).toContainText('201');
    await expect(page.getByTestId('payment-row').filter({ hasText: body.paymentId })).toContainText('SUCCESS');

    const db = await (await page.request.get(`/api/lab/db/payments?id=${body.paymentId}`)).json();
    expect(db.rows[0]).toMatchObject({ biller: 'Internet', amount, status: 'SUCCESS', transaction_id: body.transactionId });
    const tx = await (await page.request.get(`/api/transactions/${body.transactionId}`)).json();
    expect(tx.data).toMatchObject({ type: 'Payment', amount, direction: 'DEBIT', reference: body.paymentId });
  });

  test('transfer shows loading state, success state, toast and API panel', async ({ page }) => {
    const amount = randomAmount(1, 60);
    await page.goto('/transfers');
    await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
    await page.getByLabel('Description').fill('Hybrid suite');
    await page.getByRole('button', { name: 'Review Transfer' }).click();
    await expect(page.getByTestId('review-amount')).toHaveText(`$${amount.toFixed(2)}`);
    await page.getByLabel('OTP').fill('123456');
    await page.getByRole('button', { name: 'Confirm Transfer' }).click();
    await expect(page.getByText('Processing Transfer...')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transfer Successful' })).toBeVisible();
    const txId = await page.getByTestId('transfer-transaction-id').textContent();
    await expect(page.getByTestId('success-toast')).toContainText(txId!);
    await expect(page.getByTestId('api-response-body')).toContainText(`"transactionId": "${txId}"`);
    await expect(page.getByTestId('transfer-history')).toContainText(`$${amount.toFixed(2)}`);
  });

  test('invalid OTP keeps the user on the review step', async ({ page }) => {
    await page.goto('/transfers');
    await page.getByLabel('Amount', { exact: true }).fill(randomAmount().toFixed(2));
    await page.getByRole('button', { name: 'Review Transfer' }).click();
    await page.getByLabel('OTP').fill('000000');
    await page.getByRole('button', { name: 'Confirm Transfer' }).click();
    await expect(page.getByTestId('transfer-error-code')).toHaveText('INVALID_OTP');
    await expect(page.getByTestId('transfer-review')).toBeVisible();
  });

  test('insufficient balance shows the available balance', async ({ page }) => {
    await page.goto('/transfers');
    await page.getByLabel('Amount', { exact: true }).fill('999999');
    await page.getByRole('button', { name: 'Review Transfer' }).click();
    await page.getByLabel('OTP').fill('123456');
    await page.getByRole('button', { name: 'Confirm Transfer' }).click();
    await expect(page.getByTestId('transfer-error')).toContainText('Insufficient account balance');
    await expect(page.getByTestId('transfer-error')).toContainText('Available:');
  });
});
