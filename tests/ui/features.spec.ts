import { test, expect } from '../fixtures/auth';

test.describe('Dialogs lab', () => {
  test('all three alerts have the expected messages', async ({ page }) => {
    await page.goto('/lab/dialogs');
    const messages: string[] = [];
    page.on('dialog', async (d) => {
      expect(d.type()).toBe('alert');
      messages.push(d.message());
      await d.accept();
    });
    for (const name of ['Simple Alert', 'Transaction Alert', 'Security Alert']) {
      await page.getByRole('button', { name }).click();
    }
    await expect(page.getByTestId('dialog-result')).toHaveText('Security alert acknowledged');
    expect(messages[0]).toBe('Welcome to the ParaBank Pro Automation Lab');
    expect(messages[1]).toBe('Transaction submitted successfully');
    expect(messages[2]).toContain('Security Alert');
  });

  test('confirm accept and dismiss', async ({ page }) => {
    await page.goto('/lab/dialogs');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete Beneficiary' }).click();
    await expect(page.getByTestId('dialog-result')).toHaveText('Beneficiary Robert Smith deleted');
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', { name: 'Delete Beneficiary' }).click();
    await expect(page.getByTestId('dialog-result')).toHaveText('Deletion cancelled');
  });

  test('prompt + API lookup', async ({ page }) => {
    const tx = (await (await page.request.get('/api/transactions?pageSize=1')).json()).data[0];
    await page.goto('/lab/dialogs');
    page.once('dialog', (d) => d.accept(tx.transactionId));
    const res = page.waitForResponse(`**/api/transactions/${tx.transactionId}`);
    await page.getByRole('button', { name: 'Look Up Transaction (API)' }).click();
    expect((await res).status()).toBe(200);
    await expect(page.getByTestId('dialog-result')).toContainText(`Found ${tx.transactionId}`);
  });
});

test.describe('Cards', () => {
  test('change PIN validates weak PINs then succeeds', async ({ page }) => {
    await page.goto('/cards');
    const card = page.getByTestId('card-item').first();
    await card.getByRole('button', { name: 'Change PIN' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('New PIN').fill('1234');
    await dialog.getByLabel('Confirm PIN').fill('1234');
    await dialog.getByRole('button', { name: 'Update PIN' }).click();
    await expect(dialog.getByText('This PIN is too easy to guess.').first()).toBeVisible();
    await dialog.getByLabel('New PIN').fill('4826');
    await dialog.getByLabel('Confirm PIN').fill('4826');
    await dialog.getByRole('button', { name: 'Update PIN' }).click();
    await expect(page.getByTestId('success-toast')).toContainText('PIN');
  });

  test('spending limit is persisted', async ({ page }) => {
    await page.goto('/cards');
    const card = page.getByTestId('card-item').first();
    await card.getByRole('button', { name: 'Set Spending Limit' }).click();
    await page.getByLabel('Monthly Spending Limit').fill('3200');
    await page.getByRole('button', { name: 'Save Limit' }).click();
    await expect(card).toContainText('Limit $3,200.00');
  });
});

test.describe('Notifications', () => {
  test('filter by type and mark as read', async ({ page }) => {
    await page.goto('/notifications');
    await page.getByLabel('Type').selectOption('Security');
    const items = page.getByTestId('notification-item');
    await expect(items.first()).toContainText('Security');
    for (const item of await items.all()) await expect(item).toContainText('Security');
    await page.getByRole('tab', { name: 'Unread' }).click();
    const unread = items.first();
    const title = await unread.locator('p').first().textContent();
    await unread.getByRole('button', { name: 'Mark as read' }).click();
    await page.getByRole('tab', { name: 'Read', exact: true }).click();
    await expect(items.filter({ hasText: title! }).first()).toBeVisible();
  });
});

test.describe('Forms lab', () => {
  test('submits every control type and echoes the payload', async ({ page }) => {
    await page.goto('/lab/forms');
    await page.getByRole('button', { name: 'Submit Profile' }).click();
    await expect(page.getByText('Full name is required')).toBeVisible();
    await page.getByLabel('Full Name').fill('John Carter');
    await page.getByLabel('Email Address').fill('john@example.com');
    await page.getByLabel('Country').selectOption('IN');
    await page.getByLabel('Date of Birth').fill('1990-05-17');
    await page.getByLabel('SMS').check();
    await page.getByLabel('Investments').check();
    await page.getByRole('switch', { name: 'Paperless statements' }).click();
    await page.getByLabel('I agree to the KYC terms').check();
    const req = page.waitForRequest('**/api/lab/echo');
    await page.getByRole('button', { name: 'Submit Profile' }).click();
    expect((await req).postDataJSON()).toMatchObject({ fullName: 'John Carter', country: 'IN', contact: 'sms', interests: ['Investments'], paperless: true });
    await expect(page.getByTestId('form-success')).toHaveText('Profile submitted for John Carter');
  });
});
