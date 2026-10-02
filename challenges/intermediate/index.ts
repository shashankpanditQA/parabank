import { ch, FIXTURE_IMPORT as F, type Challenge } from '../types';

const L = 'intermediate' as const;

const waitTx = (cond: string) => `page.waitForResponse((r) => r.url().includes('/api/transactions') && ${cond})`;

export const INTERMEDIATE: Challenge[] = [
  ch({
    id: 26, title: 'Search Transactions', category: 'Tables', page: '/transactions',
    description: 'Search filters the table on the server.',
    objective: 'Search for "Netflix" and verify every visible row mentions Netflix.',
    skills: ['waitForResponse', 'Iterating rows', 'nth()'],
    expected: 'All rows on the page contain "Netflix".',
    hints: ['Wait for the debounced request before reading rows.', 'rows.count() gives you the number of rows.', 'Loop with rows.nth(i).'],
    solution: `${F}

test('search transactions', async ({ page }) => {
  await page.goto('/transactions');
  const searched = ${waitTx("r.url().includes('search=Netflix')")};
  await page.getByLabel('Search').fill('Netflix');
  await searched;
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toContainText('Netflix');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText(/netflix/i);
  }
});`,
    why: ['Waiting for the matching response guarantees you read the filtered table, not the stale one.'],
  }, L),
  ch({
    id: 27, title: 'Find Transaction by Customer', category: 'Tables', page: '/transactions',
    description: 'Never rely on a hard-coded row number — rows move as data changes.',
    objective: 'Find the transaction containing "Amazon" and verify its amount and status without using a row index.',
    skills: ['Dynamic locator', 'filter()', 'hasText', 'Assertions'],
    expected: 'The Amazon row shows -$249.99 and status Completed.',
    hints: ['Show more rows: /transactions?pageSize=50', "getByTestId('transaction-row').filter({ hasText: 'Amazon' })", 'Look inside the row with row.getByText(...)'],
    solution: `${F}

test('find Amazon transaction', async ({ page }) => {
  await page.goto('/transactions?pageSize=50');
  const row = page.getByTestId('transaction-row').filter({ hasText: 'Amazon' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('$249.99');
  await expect(row.getByText('Completed')).toBeVisible();
  await expect(row.getByRole('cell').nth(0)).toHaveText(/^TXN-\\d{6}$/);
});`,
    why: ['filter({ hasText }) keeps the locator correct no matter where the row moves.', 'Scoping assertions to the row avoids matching other "Completed" badges.'],
  }, L),
  ch({
    id: 28, title: 'Filter by Status', category: 'Tables', page: '/transactions',
    description: 'Status is a server-side filter.',
    objective: 'Filter by "Failed" and verify every row is Failed.',
    skills: ['selectOption()', 'Row iteration'],
    expected: 'Every row shows status Failed; URL contains status=Failed.',
    hints: ['getByLabel(\'Status\')', 'Wait for the response with status=Failed.', 'Use allInnerTexts() for a quick check.'],
    solution: `${F}

test('filter by status', async ({ page }) => {
  await page.goto('/transactions');
  const filtered = ${waitTx("r.url().includes('status=Failed')")};
  await page.getByLabel('Status').selectOption('Failed');
  await filtered;
  await expect(page).toHaveURL(/status=Failed/);
  const texts = await page.getByTestId('transaction-row').allInnerTexts();
  expect(texts.length).toBeGreaterThan(0);
  for (const t of texts) expect(t).toContain('Failed');
});`,
    why: ['allInnerTexts() is a quick snapshot once you know the table has settled.'],
  }, L),
  ch({
    id: 29, title: 'Combine Filters', category: 'Tables', page: '/transactions',
    description: 'Combine transaction type and account filters.',
    objective: 'Show only Salary transactions for the checking account.',
    skills: ['Multiple filters', 'getByLabel({ exact })'],
    expected: 'Every row is type Salary on account CHK-…; the active filter count is 2.',
    hints: ['Labels: "Transaction Type" and "Account" (exact).', 'Account options are account numbers.', 'data-testid="active-filter-count"'],
    solution: `${F}

test('type + account filters', async ({ page }) => {
  const accounts = await (await page.request.get('/api/accounts')).json();
  const checking = accounts.data.find((a: any) => a.accountType === 'CHECKING').accountNumber;
  await page.goto('/transactions');
  await page.getByLabel('Transaction Type').selectOption('Salary');
  await page.getByLabel('Account', { exact: true }).selectOption(checking);
  await expect(page.getByTestId('active-filter-count')).toHaveText('2');
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toContainText('Salary');
  for (const row of await rows.all()) {
    await expect(row).toContainText('Salary');
    await expect(row).toContainText(checking);
  }
});`,
    why: ['page.request shares cookies with the page — perfect for fetching test data first.', 'locator.all() returns an array of row locators to iterate.'],
  }, L),
  ch({
    id: 30, title: 'Sort by Amount', category: 'Tables', page: '/transactions',
    description: 'Column headers are sort buttons.',
    objective: 'Sort by Amount ascending and verify the amounts are in ascending order.',
    skills: ['Sorting', 'aria-sort', 'Parsing cell text'],
    expected: 'The Amount column header has aria-sort="ascending" and amounts are non-decreasing.',
    hints: ["getByRole('columnheader', { name: 'Amount' })", 'Amount is the 5th cell (index 4).', 'Strip "$", "," and sign before parsing.'],
    solution: `${F}

test('sort by amount', async ({ page }) => {
  await page.goto('/transactions');
  const header = page.getByRole('columnheader', { name: 'Amount', exact: true });
  await header.getByRole('button').click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  await expect(page).toHaveURL(/sortBy=amount/);
  const cells = page.getByTestId('transaction-row').locator('td:nth-child(5)');
  await expect(cells.first()).toBeVisible();
  const values = (await cells.allInnerTexts()).map((t) => Number(t.replace(/[^\\d.]/g, '')));
  expect(values).toEqual([...values].sort((a, b) => a - b));
});`,
    why: ['aria-sort is the accessible way to expose sort direction — and a stable assertion target.'],
  }, L),
  ch({
    id: 31, title: 'Pagination', category: 'Tables', page: '/transactions',
    description: '128+ transactions are split into pages of 10.',
    objective: 'Go to page 2 using Next and verify the pagination state.',
    skills: ['Pagination', 'aria-current'],
    expected: 'Page 2 button has aria-current="page"; summary says "Showing 11–20".',
    hints: ['Buttons are named "Next", "Previous" and "Page N".', 'data-testid="pagination-summary"', 'URL gets page=2.'],
    solution: `${F}

test('pagination next', async ({ page }) => {
  await page.goto('/transactions');
  const firstId = await page.getByTestId('transaction-row').first().getAttribute('data-transaction-id');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('pagination-summary')).toContainText('Showing 11–20');
  await expect(page.getByTestId('transaction-row').first()).not.toHaveAttribute('data-transaction-id', firstId!);
  await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
});`,
    why: ['Comparing the first row before/after proves the data actually changed.'],
  }, L),
  ch({
    id: 32, title: 'Change Page Size', category: 'Tables', page: '/transactions',
    description: 'Rows per page can be 5, 10, 25 or 50.',
    objective: 'Set 25 rows per page and verify 25 rows are shown.',
    skills: ['selectOption()', 'toHaveCount'],
    expected: '25 transaction rows and "Showing 1–25".',
    hints: ['Label: "Rows per page".', 'toHaveCount retries until the table re-renders.', 'Check the summary text too.'],
    solution: `${F}

test('page size 25', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByLabel('Rows per page').selectOption('25');
  await expect(page.getByTestId('transaction-row')).toHaveCount(25);
  await expect(page.getByTestId('pagination-summary')).toContainText('Showing 1–25');
});`,
    why: ['toHaveCount is a retrying assertion, so no manual waits are needed.'],
  }, L),
  ch({
    id: 33, title: 'Date Range Filter', category: 'Tables', page: '/transactions',
    description: 'Filter transactions between two dates.',
    objective: 'Show the last 30 days of activity and verify every returned date is in range (via the API response).',
    skills: ['Date inputs', 'waitForResponse', 'response.json()'],
    expected: 'Every transaction date in the response is between the From and To dates.',
    hints: ['Labels: "From Date" and "To Date".', 'Wait for the response that includes toDate=…', 'Compare ISO strings.'],
    solution: `${F}

test('date range', async ({ page }) => {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  await page.goto('/transactions');
  await page.getByLabel('From Date').fill(from);
  const res = ${waitTx("r.url().includes('toDate=' + to)")};
  await page.getByLabel('To Date').fill(to);
  const body = await (await res).json();
  expect(body.data.length).toBeGreaterThan(0);
  for (const t of body.data) {
    expect(t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to).toBe(true);
  }
  await expect(page.getByTestId('transaction-row')).toHaveCount(body.data.length);
});`,
    why: ['Validating the API payload is faster and more precise than parsing formatted UI dates.'],
  }, L),
  ch({
    id: 34, title: 'Amount Range Filter', category: 'Tables', page: '/transactions',
    description: 'Filter by minimum and maximum amount.',
    objective: 'Show transactions between $100 and $500 and verify each amount.',
    skills: ['Number inputs', 'Response validation'],
    expected: 'All amounts are between 100 and 500.',
    hints: ['Labels: "Min Amount", "Max Amount".', 'Wait for the response with maxAmount=500.', 'body.data[i].amount is a number.'],
    solution: `${F}

test('amount range', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByLabel('Min Amount').fill('100');
  const res = ${waitTx("r.url().includes('maxAmount=500')")};
  await page.getByLabel('Max Amount').fill('500');
  const body = await (await res).json();
  for (const t of body.data) {
    expect(t.amount).toBeGreaterThanOrEqual(100);
    expect(t.amount).toBeLessThanOrEqual(500);
  }
});`,
    why: ['Filters fire a request per keystroke; waiting for the final URL avoids reading an intermediate state.'],
  }, L),
  ch({
    id: 35, title: 'Clear Filters', category: 'Tables', page: '/transactions',
    description: 'One click resets every filter.',
    objective: 'Apply a filter, then clear it and verify the full list returns.',
    skills: ['State reset', 'URL assertions'],
    expected: '"No filters applied" is shown and the URL has no status parameter.',
    hints: ['Button: "Clear Filters".', 'Active filter count has a test id.', 'expect(page).not.toHaveURL(/status=/)'],
    solution: `${F}

test('clear filters', async ({ page }) => {
  await page.goto('/transactions?status=Pending');
  await expect(page.getByTestId('active-filter-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  await expect(page.getByText('No filters applied')).toBeVisible();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.getByLabel('Status')).toHaveValue('');
});`,
    why: ['Deep-linking with query params sets up state instantly without clicking through the UI.'],
  }, L),
  ch({
    id: 36, title: 'Nested Table: Customer → Account', category: 'Tables', page: '/lab/tables',
    description: 'A customer row expands into an accounts table with nested transactions.',
    objective: "Find Sarah Mitchell's checking balance in the nested table and compare it with the API.",
    skills: ['has / hasText', 'Nested locators', 'API comparison'],
    expected: "The UI balance equals the balance in GET /api/lab/directory.",
    hints: ['Each customer is a tbody with data-testid="customer-group".', 'Expand with the "Toggle accounts for …" button.', 'Format the API number with toLocaleString to compare.'],
    solution: `${F}

test('nested table balance', async ({ page }) => {
  const res = page.waitForResponse('**/api/lab/directory');
  await page.goto('/lab/tables');
  const directory = await (await res).json();
  const sarah = directory.data.find((c: any) => c.name === 'Sarah Mitchell');
  const checking = sarah.accounts.find((a: any) => a.type === 'CHECKING');

  const group = page.getByTestId('customer-group').filter({ hasText: 'Sarah Mitchell' });
  await group.getByRole('button', { name: 'Toggle accounts for Sarah Mitchell' }).click();
  const accountRow = group.getByTestId('account-row').filter({ hasText: checking.accountNumber });
  const expected = '$' + checking.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(accountRow.getByTestId('account-balance')).toHaveText(expected);
});`,
    why: ['Chaining locators (group → row → cell) mirrors the table hierarchy.', 'Using the API as the source of truth makes the test data-independent.'],
  }, L),
  ch({
    id: 37, title: 'first(), last() and nth()', category: 'Locators', page: '/transactions',
    description: 'Positional locators are OK when order is the point of the test.',
    objective: 'Verify the first row is the newest transaction and matches the API response order.',
    skills: ['first()', 'last()', 'nth()'],
    expected: 'Row 0 equals data[0] and the last row equals the last item of the API page.',
    hints: ['Default sort is date descending.', 'Rows expose data-transaction-id.', 'Capture the API response on page load.'],
    solution: `${F}

test('positional locators', async ({ page }) => {
  const res = page.waitForResponse((r) => r.url().includes('/api/transactions?'));
  await page.goto('/transactions');
  const body = await (await res).json();
  const rows = page.getByTestId('transaction-row');
  await expect(rows.first()).toHaveAttribute('data-transaction-id', body.data[0].transactionId);
  await expect(rows.nth(1)).toHaveAttribute('data-transaction-id', body.data[1].transactionId);
  await expect(rows.last()).toHaveAttribute('data-transaction-id', body.data[body.data.length - 1].transactionId);
});`,
    why: ['Here the order IS the requirement, so positional locators are appropriate.'],
  }, L),
  ch({
    id: 38, title: 'Modal: Open a New Account', category: 'Modals & Toasts', page: '/accounts',
    description: 'Opening an account uses a modal dialog.',
    objective: 'Open a Savings account named "Vacation Fund" and verify it appears in the table.',
    skills: ['getByRole(dialog)', 'Scoped locators', 'Toasts'],
    expected: 'Toast "Account opened" and a new row with "Vacation Fund".',
    hints: ["The modal is role=dialog named 'Open New Account'.", 'Scope the submit button to the dialog.', 'The new row nickname is under the account type.'],
    solution: `${F}

test('open savings account', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Open New Account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Open New Account' });
  await dialog.getByLabel('Savings').check();
  await dialog.getByLabel('Nickname').fill('Vacation Fund');
  await dialog.getByRole('button', { name: 'Open Account' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('success-toast')).toContainText('Account opened');
  await expect(page.getByTestId('account-row').filter({ hasText: 'Vacation Fund' }).first()).toBeVisible();
});`,
    why: ['Scoping to the dialog avoids clicking the page button with a similar name behind it.'],
  }, L),
  ch({
    id: 39, title: 'Close a Modal with Escape', category: 'Modals & Toasts', page: '/accounts',
    description: 'Keyboard support matters.',
    objective: 'Open the new-account modal and close it with the Escape key.',
    skills: ['keyboard.press()', 'toBeHidden'],
    expected: 'The dialog disappears and no account is created.',
    hints: ["page.keyboard.press('Escape')", 'Count rows before and after.', 'toBeHidden waits for removal.'],
    solution: `${F}

test('escape closes modal', async ({ page }) => {
  await page.goto('/accounts');
  const rows = page.getByTestId('account-row');
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();
  await page.getByRole('button', { name: 'Open New Account' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(rows).toHaveCount(before);
});`,
    why: ['Testing keyboard paths catches accessibility regressions.'],
  }, L),
  ch({
    id: 40, title: 'Add a Beneficiary (Toast)', category: 'Modals & Toasts', page: '/beneficiaries',
    description: 'Adding a beneficiary shows a success toast.',
    objective: 'Add a beneficiary with unique data and validate the toast and the new row.',
    skills: ['Forms in modals', 'Toasts', 'Dynamic data'],
    expected: 'Toast "Beneficiary added" containing a BEN- id; new row visible.',
    hints: ['Account number: 8-17 digits.', 'IFSC format: ABCD0123456.', 'Toast data-testid="success-toast".'],
    solution: `${F}

test('add beneficiary', async ({ page }) => {
  const name = 'PW Payee ' + Date.now();
  const account = String(Date.now()).slice(-12);
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Account Number').fill(account);
  await dialog.getByLabel('Bank').selectOption('Chase Bank');
  await dialog.getByLabel('IFSC').fill('CHAS0123456');
  await dialog.getByLabel('Nickname').fill('PW');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  const toast = page.getByTestId('success-toast');
  await expect(toast).toContainText('Beneficiary added');
  await expect(toast).toContainText(/BEN-\\d{6}/);
  await expect(page.getByTestId('beneficiary-row').filter({ hasText: name })).toBeVisible();
});`,
    why: ['Timestamps make names and account numbers unique for every run.'],
  }, L),
  ch({
    id: 41, title: 'Field Validation from the API', category: 'Forms', page: '/beneficiaries',
    description: 'The server validates IFSC codes.',
    objective: 'Submit an invalid IFSC and verify the field error.',
    skills: ['Error messages', 'aria-invalid'],
    expected: '"IFSC must look like ABCD0123456 (4 letters, 0, 6 characters)." appears under the IFSC field.',
    hints: ['Fill every other field correctly.', 'The error has id "ben-ifsc-error".', 'The dialog stays open.'],
    solution: `${F}

test('invalid IFSC', async ({ page }) => {
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill('Invalid Ifsc');
  await dialog.getByLabel('Account Number').fill('123456789012');
  await dialog.getByLabel('Bank').selectOption('Citibank');
  await dialog.getByLabel('IFSC').fill('BAD123');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  await expect(dialog.getByText('IFSC must look like ABCD0123456')).toBeVisible();
  await expect(dialog).toBeVisible();
});`,
    why: ['Asserting inside the dialog keeps the locator unambiguous.'],
  }, L),
  ch({
    id: 42, title: 'Duplicate Beneficiary', category: 'Forms', page: '/beneficiaries',
    description: 'The same account number cannot be added twice (HTTP 409).',
    objective: 'Try to add a beneficiary with an existing account number.',
    skills: ['Conflict errors', 'waitForResponse'],
    expected: '409 response with DUPLICATE_BENEFICIARY and the message shown in the modal.',
    hints: ['Get an existing account number from GET /api/beneficiaries.', 'The form error has data-testid="beneficiary-form-error".', 'Assert the response status.'],
    solution: `${F}

test('duplicate beneficiary', async ({ page }) => {
  const list = await (await page.request.get('/api/beneficiaries')).json();
  const existing = list.data[0];
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add Beneficiary' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Beneficiary' });
  await dialog.getByLabel('Name', { exact: true }).fill('Duplicate Person');
  await dialog.getByLabel('Account Number').fill(existing.accountNumber);
  await dialog.getByLabel('Bank').selectOption('Wells Fargo');
  await dialog.getByLabel('IFSC').fill('WFBI0123456');
  const res = page.waitForResponse((r) => r.url().endsWith('/api/beneficiaries') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Add Beneficiary' }).click();
  expect((await res).status()).toBe(409);
  expect((await (await res).json()).errorCode).toBe('DUPLICATE_BENEFICIARY');
  await expect(dialog.getByTestId('beneficiary-form-error')).toHaveText('A beneficiary with this account number already exists.');
});`,
    why: ['Combining the HTTP status with the UI message verifies both layers.'],
  }, L),
  ch({
    id: 43, title: 'Edit a Beneficiary', category: 'Modals & Toasts', page: '/beneficiaries',
    description: 'Create test data through the API, then edit it through the UI.',
    objective: 'Change a beneficiary nickname and verify the update.',
    skills: ['API setup', 'Edit modal', 'filter()'],
    expected: 'Toast "Beneficiary updated" and the row shows the new nickname.',
    hints: ['Seed the record with page.request.post().', 'Find the row by name, then click its Edit button.', 'fill() replaces the existing value.'],
    solution: `${F}

test('edit beneficiary nickname', async ({ page }) => {
  const name = 'Edit Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-11), bank: 'Citibank', ifsc: 'CITI0123456', nickname: 'Old' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Beneficiary' });
  await expect(dialog.getByLabel('Nickname')).toHaveValue('Old');
  await dialog.getByLabel('Nickname').fill('New Nick');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByTestId('success-toast')).toContainText('Beneficiary updated');
  await expect(row).toContainText('New Nick');
});`,
    why: ['API setup is fast and keeps the UI test focused on the edit flow.'],
  }, L),
  ch({
    id: 44, title: 'Confirm Dialog: Accept', category: 'Dialogs', page: '/beneficiaries',
    description: 'Deleting a beneficiary uses a real window.confirm().',
    objective: 'Verify the beneficiary name appears in the confirmation dialog, accept it, and verify the row is gone.',
    skills: ['page.once(dialog)', 'dialog.type()', 'dialog.message()', 'dialog.accept()'],
    expected: 'Dialog type is "confirm", message contains the name; row removed; success toast.',
    hints: ['Register the handler BEFORE clicking Delete.', 'Use page.once so the handler runs only once.', 'expect(row).toHaveCount(0)'],
    solution: `${F}

test('delete beneficiary (accept)', async ({ page }) => {
  const name = 'Delete Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-10), bank: 'Capital One', ifsc: 'CAPO0123456' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Are you sure you want to delete this beneficiary?');
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByTestId('success-toast')).toContainText('Beneficiary deleted');
});`,
    why: ['Playwright auto-dismisses dialogs unless a handler is registered first.', 'Assertions inside the handler fail the test if the message is wrong.'],
  }, L),
  ch({
    id: 45, title: 'Confirm Dialog: Dismiss', category: 'Dialogs', page: '/beneficiaries',
    description: 'Cancelling the confirmation must keep the beneficiary.',
    objective: 'Dismiss the confirmation and verify nothing was deleted.',
    skills: ['dialog.dismiss()', 'Info toast'],
    expected: 'Row still visible and an info toast "Delete cancelled".',
    hints: ['dialog.dismiss() is "Cancel".', 'Toast test id: info-toast.', 'Assert the row is still there.'],
    solution: `${F}

test('delete beneficiary (dismiss)', async ({ page }) => {
  const name = 'Keep Me ' + Date.now();
  await page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-9), bank: 'Chase Bank', ifsc: 'CHAS0654321' },
  });
  await page.goto('/beneficiaries');
  const row = page.getByTestId('beneficiary-row').filter({ hasText: name });
  page.once('dialog', (dialog) => dialog.dismiss());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByTestId('info-toast')).toContainText('Delete cancelled');
  await expect(row).toBeVisible();
});`,
    why: ['Negative paths of dialogs are as important as the happy path.'],
  }, L),
  ch({
    id: 46, title: 'JavaScript Alert', category: 'Dialogs', page: '/lab/dialogs',
    description: 'Alerts block the page until handled.',
    objective: 'Click "Transaction Alert", capture the alert and validate its message.',
    skills: ['alert()', 'dialog.message()'],
    expected: 'Message "Transaction submitted successfully"; result text "Transaction alert acknowledged".',
    hints: ['page.once(\'dialog\', ...)', 'dialog.type() is "alert".', 'Result has data-testid="dialog-result".'],
    solution: `${F}

test('transaction alert', async ({ page }) => {
  await page.goto('/lab/dialogs');
  const dialogPromise = page.waitForEvent('dialog');
  const click = page.getByRole('button', { name: 'Transaction Alert' }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('alert');
  expect(dialog.message()).toBe('Transaction submitted successfully');
  await dialog.accept();
  await click;
  await expect(page.getByTestId('dialog-result')).toHaveText('Transaction alert acknowledged');
});`,
    why: ['waitForEvent(\'dialog\') returns the dialog object so you can assert outside a callback.', 'The click only resolves after the dialog is handled — start it without awaiting first.'],
  }, L),
  ch({
    id: 47, title: 'Prompt Dialog: Accept with Value', category: 'Dialogs', page: '/lab/dialogs',
    description: 'Prompts accept a text value.',
    objective: 'Enter "PAYMENT-12345" in the transaction reference prompt.',
    skills: ['prompt()', 'dialog.accept(value)'],
    expected: 'Result: "Reference saved: PAYMENT-12345".',
    hints: ['dialog.type() is "prompt".', 'Pass the value to accept().', 'Button: "Enter Transaction Reference".'],
    solution: `${F}

test('prompt accept', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toBe('Enter transaction reference');
    await dialog.accept('PAYMENT-12345');
  });
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Reference saved: PAYMENT-12345');
});`,
    why: ['accept(text) types into the prompt and presses OK in one step.'],
  }, L),
  ch({
    id: 48, title: 'Prompt Dialog: Cancel', category: 'Dialogs', page: '/lab/dialogs',
    description: 'Cancelling a prompt returns null to the page.',
    objective: 'Dismiss the prompt and verify the cancellation message.',
    skills: ['dialog.dismiss()'],
    expected: 'Result: "Prompt cancelled".',
    hints: ['dismiss() = Cancel.', 'Same button as the previous challenge.', 'Assert dialog-result.'],
    solution: `${F}

test('prompt cancel', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Prompt cancelled');
});`,
    why: ['The page treats null (cancel) differently from an empty string — test both.'],
  }, L),
  ch({
    id: 49, title: 'Prompt Default Value', category: 'Dialogs', page: '/lab/dialogs',
    description: 'Prompts can have a default value.',
    objective: 'Verify dialog.defaultValue() and accept the default.',
    skills: ['dialog.defaultValue()'],
    expected: 'Default value "TXN-REF-0001"; result "Reference saved: TXN-REF-0001".',
    hints: ['defaultValue() is synchronous — assert it before accepting.', 'accept() with no argument submits an EMPTY string in Chromium.', 'Pass the default back: dialog.accept(dialog.defaultValue()).'],
    solution: `${F}

test('prompt default value', async ({ page }) => {
  await page.goto('/lab/dialogs');
  page.once('dialog', async (dialog) => {
    expect(dialog.defaultValue()).toBe('TXN-REF-0001');
    await dialog.accept(dialog.defaultValue());
  });
  await page.getByRole('button', { name: 'Enter Transaction Reference' }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Reference saved: TXN-REF-0001');
});`,
    why: ['Gotcha: accept() without text submits an empty prompt, not the default. Pass defaultValue() explicitly.'],
  }, L),
  ch({
    id: 50, title: 'iFrame: Payment Gateway', category: 'iFrames', page: '/lab/iframes',
    description: 'The card form lives inside a real iframe.',
    objective: 'Enter payment details inside the iframe and submit.',
    skills: ['frameLocator()', 'getByLabel inside frames'],
    expected: '"Payment details accepted for card ending 1111" inside the frame, and the parent page receives the message.',
    hints: ["page.frameLocator('[data-testid=\"payment-frame\"]')", "Use { exact: true } for the 'Name' label.", 'The parent shows data-testid="parent-frame-message".'],
    solution: `${F}

test('fill iframe payment form', async ({ page }) => {
  await page.goto('/lab/iframes');
  const frame = page.frameLocator('[data-testid="payment-frame"]');
  await frame.getByLabel('Card Number').fill('4111111111111111');
  await frame.getByLabel('Expiry Date').fill('12/29');
  await frame.getByLabel('CVV').fill('123');
  await frame.getByLabel('Name', { exact: true }).fill('John Carter');
  await frame.getByRole('button', { name: 'Pay Now' }).click();
  await expect(frame.getByText('Payment details accepted for card ending 1111')).toBeVisible();
  await expect(page.getByTestId('parent-frame-message')).toContainText(/AUTH-\\d{6}/);
});`,
    why: ['frameLocator pierces the frame boundary; page.getByLabel alone would never find these inputs.', 'Newer API: page.getByTestId(\'payment-frame\').contentFrame() does the same.'],
  }, L),
  ch({
    id: 51, title: 'Named iFrame', category: 'iFrames', page: '/lab/iframes',
    description: 'Frames can be found by their name attribute.',
    objective: 'Use page.frame({ name: "bank-payment-frame" }) to send money from the widget.',
    skills: ['page.frame()', 'Radio & select inside frames'],
    expected: 'Confirmation "… $250.00 to Alice Johnson (instant, fee paid by receiver)".',
    hints: ['page.frame() returns a Frame or null — it does not wait, so poll with expect.poll().', 'Frames have getByLabel/getByRole too.', 'Radio labels: Sender / Receiver.'],
    solution: `${F}

test('named iframe', async ({ page }) => {
  await page.goto('/lab/iframes');
  // The SPA renders the iframe after page load, so poll until the frame is attached.
  await expect.poll(() => page.frame({ name: 'bank-payment-frame' })).not.toBeNull();
  const frame = page.frame({ name: 'bank-payment-frame' });
  await frame!.getByLabel('Beneficiary Name').fill('Alice Johnson');
  await frame!.getByLabel('Account Number').fill('123456789012');
  await frame!.getByLabel('Amount').fill('250');
  await frame!.getByLabel('Speed').selectOption('instant');
  await frame!.getByLabel('Receiver').check();
  await frame!.getByRole('button', { name: 'Send Money' }).click();
  await expect(frame!.getByTestId('widget-confirmation')).toContainText('$250.00 to Alice Johnson (instant, fee paid by receiver)');
});`,
    why: ['page.frame() gives you a Frame object — useful when you need frame.url(), frame.name() or evaluate().'],
  }, L),
  ch({
    id: 52, title: 'Upload a KYC Document', category: 'Files', page: '/lab/upload',
    description: 'Upload a PDF using setInputFiles().',
    objective: 'Upload sample-files/kyc-document.pdf and verify name, size and status.',
    skills: ['setInputFiles()', 'Upload status'],
    expected: 'Status "kyc-document.pdf uploaded · VERIFIED" and a row in Uploaded Documents.',
    hints: ["getByLabel('Upload KYC Document')", 'Paths are relative to the project root.', 'Each upload card has its own Upload button.'],
    solution: `${F}

test('upload KYC document', async ({ page }) => {
  await page.goto('/lab/upload');
  const card = page.getByTestId('upload-kyc-document');
  await page.getByLabel('Upload KYC Document').setInputFiles('sample-files/kyc-document.pdf');
  await expect(card.getByTestId('selected-file')).toContainText('kyc-document.pdf');
  await card.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(card.getByTestId('upload-status')).toHaveText('kyc-document.pdf uploaded · VERIFIED');
  await expect(page.getByTestId('document-row').filter({ hasText: 'kyc-document.pdf' }).first()).toContainText('KYC Document');
});`,
    why: ['setInputFiles works on hidden or styled inputs without opening the OS file picker.'],
  }, L),
  ch({
    id: 53, title: 'Upload an Invalid File Type', category: 'Files', page: '/lab/upload',
    description: 'Only PDF, PNG and JPG are accepted (HTTP 415).',
    objective: 'Upload sample-files/invalid-file.txt and verify the error.',
    skills: ['setInputFiles()', 'Error handling'],
    expected: '415 response and the message "…is not supported. Upload a PDF, PNG or JPG."',
    hints: ['The accept attribute does not stop setInputFiles.', 'Wait for the POST /api/documents response.', 'Status element has role="alert" on error.'],
    solution: `${F}

test('reject invalid file type', async ({ page }) => {
  await page.goto('/lab/upload');
  const card = page.getByTestId('upload-address-proof');
  await page.getByLabel('Upload Address Proof').setInputFiles('sample-files/invalid-file.txt');
  const res = page.waitForResponse('**/api/documents');
  await card.getByRole('button', { name: 'Upload', exact: true }).click();
  expect((await res).status()).toBe(415);
  await expect(card.getByRole('alert')).toContainText('Upload a PDF, PNG or JPG.');
});`,
    why: ['Client-side "accept" is only a hint — servers must validate, and tests should prove it.'],
  }, L),
  ch({
    id: 54, title: 'Download an Account Statement', category: 'Files', page: '/lab/download',
    description: 'The server streams a PDF with Content-Disposition: attachment.',
    objective: 'Download the statement and validate the file name and that it is a PDF.',
    skills: ["waitForEvent('download')", 'suggestedFilename()', 'path()'],
    expected: 'File name like statement-CHK-102938-2026-10.pdf; file starts with %PDF-.',
    hints: ['Start waiting for the download before clicking.', 'download.path() returns a temp file path.', 'Read it with fs.readFileSync.'],
    solution: `${F}
import fs from 'node:fs';

test('download statement', async ({ page }) => {
  await page.goto('/lab/download');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Account Statement' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^statement-CHK-\\d{6}-\\d{4}-\\d{2}\\.pdf$/);
  const file = await download.path();
  expect(fs.readFileSync(file!).subarray(0, 5).toString()).toBe('%PDF-');
});`,
    why: ['waitForEvent(\'download\') must be set up first — the event fires as soon as the click lands.'],
  }, L),
  ch({
    id: 55, title: 'Freeze and Unfreeze a Card', category: 'Modals & Toasts', page: '/cards',
    description: 'Card status changes are reflected immediately.',
    objective: 'Freeze the debit card, verify FROZEN, then unfreeze and verify ACTIVE.',
    skills: ['filter({ hasText })', 'Status badges'],
    expected: 'Status badge changes ACTIVE → FROZEN → ACTIVE.',
    hints: ['Cards have data-testid="card-item".', 'Badge: data-testid="card-status".', 'The button label switches between Freeze and Unfreeze.'],
    solution: `${F}

test('freeze and unfreeze debit card', async ({ page }) => {
  await page.goto('/cards');
  const card = page.getByTestId('card-item').filter({ hasText: 'DEBIT card' }).first();
  const status = card.getByTestId('card-status');
  if ((await status.textContent()) === 'FROZEN') await card.getByRole('button', { name: 'Unfreeze Card' }).click();
  await expect(status).toHaveText('ACTIVE');
  await card.getByRole('button', { name: 'Freeze Card' }).click();
  await expect(status).toHaveText('FROZEN');
  await card.getByRole('button', { name: 'Unfreeze Card' }).click();
  await expect(status).toHaveText('ACTIVE');
});`,
    why: ['Normalising starting state makes the test re-runnable even if a previous run failed half-way.'],
  }, L),
];
