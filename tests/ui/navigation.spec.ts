import { test, expect } from '../fixtures/auth';

const CUSTOMER_PAGES: Array<[string, string]> = [
  ['/dashboard', 'Welcome back, John'],
  ['/accounts', 'Accounts'],
  ['/transactions', 'Transactions'],
  ['/transfers', 'Transfer Money'],
  ['/payments', 'Bill Payments'],
  ['/loans', 'Loans'],
  ['/cards', 'Cards'],
  ['/beneficiaries', 'Beneficiaries'],
  ['/notifications', 'Notifications'],
  ['/support', 'Support Tickets'],
  ['/lab', 'Automation Lab'],
  ['/lab/locators', 'Locators Playground'],
  ['/lab/forms', 'Forms Lab'],
  ['/lab/tables', 'Tables Lab'],
  ['/lab/pagination', 'Pagination Lab'],
  ['/lab/iframes', 'iFrames Lab'],
  ['/lab/dialogs', 'Alerts & Dialogs'],
  ['/lab/popups', 'Popups & Windows'],
  ['/lab/tabs', 'Multiple Tabs'],
  ['/lab/api', 'API Responses'],
  ['/lab/network', 'Network Interception'],
  ['/lab/upload', 'File Upload'],
  ['/lab/download', 'File Download'],
  ['/lab/workflows', 'Advanced Workflows'],
  ['/challenges/beginner', 'Beginner Challenges'],
  ['/challenges/expert', 'Expert Challenges'],
  ['/challenges/c/105', 'Challenge #105 — Secure Banking Payment (Final Challenge)'],
  ['/api-docs', 'API Documentation'],
];

test.describe('Every page renders', () => {
  for (const [path, heading] of CUSTOMER_PAGES) {
    test(`${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByTestId('error-state')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});

test('challenge counts per level', async ({ page }) => {
  for (const [level, count] of [['beginner', 25], ['intermediate', 30], ['advanced', 30], ['expert', 20]] as const) {
    await page.goto(`/challenges/${level}`);
    await expect(page.getByTestId('challenge-card')).toHaveCount(count);
  }
});

test('practice console reveals hints progressively and marks completion', async ({ page }) => {
  await page.goto('/challenges/c/27');
  const console = page.getByTestId('practice-console');
  await expect(console.getByTestId('challenge-difficulty')).toHaveText('intermediate');
  await expect(console.getByText('Hint 2 (locked)')).toBeVisible();
  await console.getByRole('button', { name: 'Reveal Hint 1' }).click();
  await console.getByRole('button', { name: 'Reveal Hint 2' }).click();
  await expect(console.getByTestId('hint-2')).toContainText('filter');
  await page.getByRole('button', { name: 'Show Solution' }).click();
  await expect(page.getByTestId('solution-code')).toContainText("filter({ hasText: 'Amazon' })");
  await page.getByRole('button', { name: 'Mark as Complete' }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('parabank.challenges.completed') ?? '[]'));
  expect(stored).toContain(27);
  await page.goto('/lab');
  await expect(page.getByTestId('challenges-completed')).toContainText('1');
});

test('admin portal pages render and customers are paginated', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByTestId('stat-customers')).toContainText(/\d+/);
  await adminPage.goto('/admin/customers');
  await expect(adminPage.getByTestId('customer-row')).toHaveCount(5);
  await adminPage.getByRole('button', { name: 'Next' }).click();
  await expect(adminPage.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  await adminPage.getByLabel('Status').selectOption('DISABLED');
  await expect(adminPage.getByTestId('customer-row')).toHaveCount(1);
  await expect(adminPage.getByTestId('customer-row')).toContainText('Diana Stone');
  await adminPage.goto('/dashboard');
  await expect(adminPage).toHaveURL(/\/unauthorized/);
});
