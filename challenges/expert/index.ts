import { ch, BASE_IMPORT as B, FIXTURE_IMPORT as F, type Challenge } from '../types';

const L = 'expert' as const;

const TRANSFER_UI = (amountExpr: string, extra = '') => `  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(${amountExpr}.toFixed(2));${extra}
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');`;

const RESPONSE = `const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');`;

const GATEWAY_CARD = `  const payment = popup.frameLocator('[data-testid="payment-frame"]');
  await payment.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await payment.getByLabel('Expiry Date').fill('12/29');
  await payment.getByLabel('CVV').fill('123');
  await payment.getByLabel('Name on Card').fill('JOHN CARTER');
  await payment.getByRole('button', { name: 'Pay Now' }).click();
  const otp = payment.frameLocator('[data-testid="otp-frame"]');
  await otp.getByLabel('Enter OTP').fill('123456');`;

export const EXPERT: Challenge[] = [
  ch({
    id: 86, title: 'UI + API Hybrid Transfer', category: 'Workflows', page: '/transfers',
    description: 'UI Action → API Request → JSON → Database → UI Update. Validate every level.',
    objective: 'Transfer money in the UI, capture the API response, then find the new transaction in the table by its ID.',
    skills: ['waitForResponse', 'Toasts', 'Search by dynamic ID'],
    expected: 'Success toast; a table row with the returned transactionId shows the description and amount.',
    hints: ['Use a unique description.', 'Search the Transactions page by the returned ID.', 'Rows carry data-transaction-id.'],
    solution: `${F}

test('hybrid transfer', async ({ page }) => {
  const amount = Math.floor(Math.random() * 5000) / 100 + 2;
  const description = 'Hybrid ' + Date.now();
${TRANSFER_UI('amount', "\n  await page.getByLabel('Description').fill(description);")}
  ${RESPONSE}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  await expect(page.getByTestId('success-toast')).toContainText(body.transactionId);

  await page.goto('/transactions?search=' + body.transactionId);
  const row = page.locator('[data-transaction-id="' + body.transactionId + '"]');
  await expect(row).toContainText(description);
  await expect(row).toContainText('-$' + amount.toFixed(2));
  await expect(row).toContainText('Completed');
});`,
    why: ['Using the ID from the API ties the UI check to the exact record created.'],
  }, L),
  ch({
    id: 87, title: 'Balance Consistency', category: 'Workflows', page: '/transfers',
    description: 'Transfer $X: source −X, destination +X.',
    objective: 'Read balances via the API, transfer through the UI, and verify both balances and the dashboard.',
    skills: ['API before/after', 'Money arithmetic', 'Dashboard validation'],
    expected: 'Checking decreases and savings increases by exactly the amount; dashboard shows the new checking balance.',
    hints: ['Round to cents: Math.round(x * 100) / 100.', 'GET /api/accounts/:id returns currentBalance.', 'Default transfer: first checking → next own account.'],
    solution: `${F}

const balance = async (page: any, id: string) => (await (await page.request.get('/api/accounts/' + id)).json()).data.currentBalance as number;
const round = (n: number) => Math.round(n * 100) / 100;

test('balances stay consistent', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 1;
  const chkBefore = await balance(page, 'CHK-102938');
  const savBefore = await balance(page, 'SAV-827364');
${TRANSFER_UI('amount')}
  ${RESPONSE}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  expect(body).toMatchObject({ fromAccount: 'CHK-102938', toAccount: 'SAV-827364' });

  expect(await balance(page, 'CHK-102938')).toBe(round(chkBefore - amount));
  expect(await balance(page, 'SAV-827364')).toBe(round(savBefore + amount));
  await page.goto('/dashboard');
  const expected = (chkBefore - amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(page.getByTestId('checking-balance')).toContainText(expected);
});`,
    why: ['Floating point needs rounding to cents before comparing money.'],
  }, L),
  ch({
    id: 88, title: 'Database Validation', category: 'Workflows', page: '/transfers',
    description: 'GET /api/lab/db/:table exposes rows for consistency checks.',
    objective: 'After a UI transfer, verify the transfers and transactions tables contain matching rows.',
    skills: ['API + DB consistency', 'toMatchObject'],
    expected: 'transfers row (status COMPLETED, amount X) links to a transactions row whose balance_after equals the API balanceAfter.',
    hints: ['Response includes transferId, transactionId and balanceAfter.', 'GET /api/lab/db/transfers?id=TRF-…', 'Column names are snake_case.'],
    solution: `${F}

test('database state after transfer', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 3;
${TRANSFER_UI('amount')}
  ${RESPONSE}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();

  const transfers = await (await page.request.get('/api/lab/db/transfers?id=' + body.transferId)).json();
  expect(transfers.rows[0]).toMatchObject({
    id: body.transferId, transaction_id: body.transactionId, from_account: body.fromAccount,
    to_account: body.toAccount, amount: body.amount, status: 'COMPLETED',
  });
  const txs = await (await page.request.get('/api/lab/db/transactions?id=' + body.transactionId)).json();
  expect(txs.rows[0]).toMatchObject({ account_id: body.fromAccount, direction: 'DEBIT', amount: body.amount, balance_after: body.balanceAfter, reference: body.transferId });
});`,
    why: ['Checking persisted rows catches bugs where the API responds OK but writes the wrong data.'],
  }, L),
  ch({
    id: 89, title: 'Popup + iFrame + Nested OTP', category: 'Workflows', page: '/lab/workflows',
    description: 'Main page → popup → payment iframe → card form → OTP iframe → confirm.',
    objective: 'Complete the gateway checkout opened from Advanced Workflows.',
    skills: ['Popups', 'Nested frames', 'Dialogs on popups'],
    expected: 'Popup shows "Payment Complete"; frame shows "Payment Successful".',
    hints: ['Dialogs from the popup\'s frames fire on the popup page, not the opener.', 'Register popup.once(\'dialog\') before Verify OTP.', 'Result box: #checkout-result (role=status).'],
    solution: `${F}

test('popup checkout with nested OTP', async ({ page }) => {
  await page.goto('/lab/workflows');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Payment Gateway' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Secure Payment Gateway' })).toBeVisible();
${GATEWAY_CARD}
  popup.once('dialog', (d) => d.accept());
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(payment.getByText('Payment Successful')).toBeVisible();
  await expect(popup.getByText('Payment Complete')).toBeVisible();
});`,
    why: ['Each Page owns its dialogs — attach the handler to the page that hosts the frame.'],
  }, L),
  ch({
    id: 90, title: 'Popup + API Response', category: 'API', page: '/lab/workflows',
    description: 'Combine waitForEvent(\'popup\') with waitForResponse().',
    objective: 'Capture the popup, submit payment, capture the API response and validate the JSON.',
    skills: ["waitForEvent('popup')", 'popup.waitForResponse()', 'JSON validation'],
    expected: '201 with success, PAY- id, amount 320.75, merchant "Workflow Travel Agency", cardLast4 1111.',
    hints: ['Wait for the response on the POPUP page.', 'Responses from iframes belong to their page.', 'The main page also renders the relayed response.'],
    solution: `${F}

test('popup payment API', async ({ page }) => {
  await page.goto('/lab/workflows');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Payment Gateway' }).click();
  const popup = await popupPromise;
${GATEWAY_CARD}
  popup.once('dialog', (d) => d.accept());
  const responsePromise = popup.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({ success: true, status: 'SUCCESS', amount: 320.75, merchant: 'Workflow Travel Agency', cardLast4: '1111', channel: 'GATEWAY' });
  expect(body.paymentId).toMatch(/^PAY-\\d{6}$/);
  await expect(page.getByTestId('api-response-body').first()).toContainText(body.paymentId);
});`,
    why: ['popup.waitForResponse sees the requests made by the popup and its frames.'],
  }, L),
  ch({
    id: 91, title: 'Dialog + API', category: 'Dialogs', page: '/beneficiaries',
    description: 'Accepting a confirm() sends DELETE /api/beneficiaries/:id.',
    objective: 'Validate the dialog, the DELETE response and that the record is really gone.',
    skills: ['Dialogs', 'waitForResponse', 'API verification'],
    expected: 'DELETE returns 200 with the name; GET list no longer contains the id.',
    hints: ['Create the beneficiary via API to know its id.', 'Match the DELETE by method and URL.', 'Re-query the API afterwards.'],
    solution: `${F}

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
});`,
    why: ['A dialog test is only complete when you prove what happened server-side.'],
  }, L),
  ch({
    id: 92, title: 'Dismiss Means No Request', category: 'Dialogs', page: '/beneficiaries',
    description: 'Cancelling must not send any DELETE request.',
    objective: 'Dismiss the delete confirmation and prove that no DELETE request was made.',
    skills: ["page.on('request')", 'Negative network assertions'],
    expected: 'Zero DELETE requests; beneficiary still exists in the API.',
    hints: ['Record every request with page.on(\'request\').', 'Wait for the "Delete cancelled" toast before asserting.', 'Double-check with GET /api/beneficiaries/:id.'],
    solution: `${F}

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
});`,
    why: ['Proving the absence of a request is as valuable as checking for one.'],
  }, L),
  ch({
    id: 93, title: 'Multiple Users', category: 'Workflows', page: '/beneficiaries',
    description: 'Two customers in two isolated browser contexts.',
    objective: "john adds a beneficiary; sarah must not see it.",
    skills: ['browser.newContext()', 'Data isolation', 'Parallel sessions'],
    expected: "john's list contains the new beneficiary; sarah's search shows the empty state.",
    hints: ['Create a context per user.', 'Log in with page.request.post(\'/api/auth/login\').', "Sarah's empty state has data-testid=\"empty-state\"."],
    solution: `${B}

async function userPage(browser: any, baseURL: string | undefined, username: string) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const res = await page.request.post('/api/auth/login', { data: { username, password: 'Demo@123' } });
  expect(res.ok()).toBeTruthy();
  return { context, page };
}

test('beneficiaries are private per customer', async ({ browser, baseURL }) => {
  const john = await userPage(browser, baseURL, 'john');
  const sarah = await userPage(browser, baseURL, 'sarah');
  const name = 'Private ' + Date.now();
  await john.page.request.post('/api/beneficiaries', {
    data: { name, accountNumber: String(Date.now()).slice(-12), bank: 'Chase Bank', ifsc: 'CHAS0111111' },
  });
  await john.page.goto('/beneficiaries');
  await expect(john.page.getByTestId('beneficiary-row').filter({ hasText: name })).toBeVisible();

  await sarah.page.goto('/beneficiaries');
  await sarah.page.getByLabel('Search beneficiaries').fill(name);
  await expect(sarah.page.getByTestId('empty-state')).toContainText('No beneficiaries found');
  await john.context.close();
  await sarah.context.close();
});`,
    why: ['Separate contexts = separate cookie jars, like two people on two computers.'],
  }, L),
  ch({
    id: 94, title: 'Customer vs Admin', category: 'Authentication', page: '/admin/customers',
    description: 'Admins can disable customers; disabled customers cannot log in.',
    objective: 'As admin, disable olivia in the UI, verify her login fails with ACCOUNT_DISABLED, then re-enable her.',
    skills: ['Role-based access', 'Admin tables', 'Cleanup in finally'],
    expected: 'Olivia gets 403 ACCOUNT_DISABLED while disabled and logs in again after re-enabling.',
    hints: ['Use a dedicated user (olivia) so other tests are unaffected.', 'The Disable button asks for confirmation.', 'Always restore state in finally.'],
    solution: `${B}

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
});`,
    why: ['finally-blocks keep shared practice data healthy even when the test fails.'],
  }, L),
  ch({
    id: 95, title: 'Loan Approval Across Roles', category: 'Workflows', page: '/admin/loans',
    description: 'Customer applies → admin approves → customer sees APPROVED.',
    objective: 'Apply for a loan via API as john, approve it in the admin UI, and verify john\'s view.',
    skills: ['Two roles', 'Confirm dialogs', 'Status transitions'],
    expected: 'Loan status APPROVED in GET /api/loans/:id and a "Loan approved" notification.',
    hints: ['Use the fixture page for john and a new context for admin.', 'Filter the admin table by the application ID.', 'Notifications: GET /api/notifications?type=Loan'],
    solution: `${F}

test('admin approves john\\'s loan', async ({ page, browser, baseURL }) => {
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
});`,
    why: ['Real workflows cross roles — separate contexts model that faithfully.'],
  }, L),
  ch({
    id: 96, title: 'Parallel Workflows', category: 'Workflows', page: '/transfers',
    description: 'Two tabs of the same user transfer money at the same time.',
    objective: 'Run two UI transfers concurrently and verify both succeed and the balance drops by the sum.',
    skills: ['Promise.all', 'Multiple pages', 'Concurrency'],
    expected: 'Two 201 responses with different transaction IDs; checking balance decreases by A + B.',
    hints: ['Open a second page in the same context.', 'Use different amounts to avoid DUPLICATE_TRANSFER.', 'Wrap each flow in an async function.'],
    solution: `${F}

async function transfer(page: any, amount: number) {
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const res = page.waitForResponse((r: any) => r.url().endsWith('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const response = await res;
  expect(response.status()).toBe(201);
  return response.json();
}

test('concurrent transfers', async ({ page, context }) => {
  const before = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  const second = await context.newPage();
  const a = Math.floor(Math.random() * 5000) / 100 + 1;
  const b = a + 1.11;
  const [r1, r2] = await Promise.all([transfer(page, a), transfer(second, b)]);
  expect(r1.transactionId).not.toBe(r2.transactionId);
  const after = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  expect(after).toBe(Math.round((before - a - b) * 100) / 100);
});`,
    why: ['Concurrency tests uncover race conditions in balance updates.'],
  }, L),
  ch({
    id: 97, title: 'Network Failure During Transfer', category: 'Network', page: '/transfers',
    description: 'The request never reaches the server.',
    objective: 'Abort POST /api/transfers, verify the UI error and that no transfer was recorded.',
    skills: ['route.abort()', 'Selective interception', 'DB verification'],
    expected: 'Error alert with NETWORK_ERROR; transfer count unchanged.',
    hints: ['Only abort POST — let GET /api/transfers through.', "route.abort('failed')", 'data-testid="transfer-error-code"'],
    solution: `${F}

test('network failure', async ({ page }) => {
  const before = (await (await page.request.get('/api/transfers')).json()).count;
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'POST' ? route.abort('failed') : route.continue(),
  );
${TRANSFER_UI('12.34')}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByTestId('transfer-error')).toContainText('Network error');
  await expect(page.getByTestId('transfer-error-code')).toHaveText('NETWORK_ERROR');
  const after = (await (await page.request.get('/api/transfers')).json()).count;
  expect(after).toBe(before);
});`,
    why: ['page.request bypasses page.route, so the DB check talks to the real server.'],
  }, L),
  ch({
    id: 98, title: 'Server Error and Retry', category: 'Network', page: '/transfers',
    description: 'The first attempt hits a 500; the retry succeeds.',
    objective: 'Inject x-simulate-failure: 500 into the first POST only, verify the error, then retry successfully.',
    skills: ['route with { times: 1 }', 'Header injection', 'Retry flows'],
    expected: 'First: INTERNAL_SERVER_ERROR. Retry: "Transfer Successful".',
    hints: ['page.route(url, handler, { times: 1 }) handles one request only — register it after page load so the initial GET does not use it up.', 'The server honours x-simulate-failure.', 'After the error the form keeps your values.'],
    solution: `${F}

test('500 then retry', async ({ page }) => {
  const amount = Math.floor(Math.random() * 3000) / 100 + 5;
${TRANSFER_UI('amount')}
  // Register after the page has loaded its own GET /api/transfers, and only touch the POST.
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'POST'
      ? route.continue({ headers: { ...route.request().headers(), 'x-simulate-failure': '500' } })
      : route.continue(),
  { times: 1 });
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByTestId('transfer-error-code')).toHaveText('INTERNAL_SERVER_ERROR');

  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await expect(page.getByLabel('OTP')).toHaveValue('123456');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  await expect(page.getByRole('heading', { name: 'Transfer Successful' })).toBeVisible();
});`,
    why: ['times: 1 makes the failure deterministic and self-cleaning.'],
  }, L),
  ch({
    id: 99, title: 'Slow API and Skeleton Loaders', category: 'Network', page: '/accounts',
    description: 'A 3-second API delay must show skeletons, not a broken page.',
    objective: 'Delay GET /api/accounts via the x-simulate-delay header and assert skeleton → data.',
    skills: ['Header injection', 'Custom timeouts', 'Loading UX'],
    expected: 'table-skeleton visible first, then account rows within 10 s.',
    hints: ['Add x-simulate-delay: 3000 with route.continue.', 'Raise the assertion timeout for the slow step only.', 'data-testid="table-skeleton"'],
    solution: `${F}

test('skeleton while slow', async ({ page }) => {
  await page.route('**/api/accounts', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-simulate-delay': '3000' } }),
  );
  const started = Date.now();
  await page.goto('/accounts');
  await expect(page.getByTestId('table-skeleton')).toBeVisible();
  await expect(page.getByTestId('account-row').first()).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(2900);
});`,
    why: ['Per-assertion timeouts keep the rest of the suite fast.'],
  }, L),
  ch({
    id: 100, title: 'Invalid JSON Handling', category: 'Network', page: '/transactions',
    description: 'A corrupted response must not crash the app.',
    objective: 'Make GET /api/transactions return invalid JSON and verify the error state.',
    skills: ['Malformed responses', 'Error states'],
    expected: 'Error state with INVALID_JSON and a Retry button; retry (without the route) recovers.',
    hints: ['x-simulate-failure: invalid-json', 'Unroute before clicking Retry.', 'data-testid="error-state"'],
    solution: `${F}

test('invalid JSON', async ({ page }) => {
  const handler = (route: any) => route.continue({ headers: { ...route.request().headers(), 'x-simulate-failure': 'invalid-json' } });
  const isList = (url: URL) => url.pathname === '/api/transactions';
  await page.route(isList, handler);
  await page.goto('/transactions');
  const error = page.getByTestId('error-state');
  await expect(error).toContainText('not valid JSON');
  await expect(error).toContainText('INVALID_JSON');
  await page.unroute(isList, handler);
  await error.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('transaction-row').first()).toBeVisible();
});`,
    why: ['unroute() restores normal traffic mid-test to verify recovery.'],
  }, L),
  ch({
    id: 101, title: 'Session Expires Mid-Workflow', category: 'Authentication', page: '/transfers',
    description: 'The session expires while the user is reviewing a transfer.',
    objective: 'Expire the session via API just before Confirm and verify the redirect.',
    skills: ['Session expiry', '401 handling', 'Redirects'],
    expected: '401 SESSION_EXPIRED on POST; redirect to /login with the expiry message; no transfer created.',
    hints: ['POST /api/auth/expire-session uses the same cookie.', 'Capture the 401 with waitForResponse.', 'Log in again via API to verify no transfer was created.'],
    solution: `${F}

test('session expires during transfer', async ({ page }) => {
  const before = (await (await page.request.get('/api/transfers')).json()).count;
${TRANSFER_UI('7.77')}
  await page.request.post('/api/auth/expire-session');
  page.on('dialog', (d) => d.accept());
  ${RESPONSE}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const res = await responsePromise;
  expect(res.status()).toBe(401);
  expect((await res.json()).errorCode).toBe('SESSION_EXPIRED');
  await expect(page).toHaveURL(/\\/login/);
  await expect(page.getByTestId('session-message')).toContainText('session has expired');

  await page.request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
  expect((await (await page.request.get('/api/transfers')).json()).count).toBe(before);
});`,
    why: ['Sharing cookies between page.request and the page lets the test manipulate the live session.'],
  }, L),
  ch({
    id: 102, title: 'beforeunload: Unsaved Transfer', category: 'Dialogs', page: '/transfers',
    description: 'Leaving an unsaved transfer shows a real beforeunload dialog (full unload) or a confirm (in-app navigation).',
    objective: 'Handle both: stay on the page when dismissing, leave when accepting.',
    skills: ['beforeunload', "page.close({ runBeforeUnload: true })", 'confirm()'],
    expected: 'Dismissing keeps you on /transfers with the amount intact (accepting would leave / close the page).',
    hints: ['Chrome only shows beforeunload after a user gesture — click the field first.', "dialog.type() === 'beforeunload'", 'Sidebar navigation uses a confirm() with "unsaved transfer" in the message.'],
    solution: `${F}

test('unsaved transfer guards', async ({ page }) => {
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).pressSequentially('250');

  // 1) In-app navigation → confirm()
  page.once('dialog', async (d) => {
    expect(d.type()).toBe('confirm');
    expect(d.message()).toContain('unsaved transfer');
    await d.dismiss();
  });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\\/transfers/);

  // 2) Closing the tab → beforeunload, dismissed = stay on the page
  const dialogPromise = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  expect(page.isClosed()).toBe(false);
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('250');
});`,
    why: ['page.close() skips beforeunload unless runBeforeUnload: true is passed.', 'Dismissing beforeunload keeps the page alive — accept lets it unload.'],
  }, L),
  ch({
    id: 103, title: 'Scheduled Transfer', category: 'Workflows', page: '/transfers',
    description: 'Future-dated transfers do not move money yet.',
    objective: 'Schedule a transfer for tomorrow and verify status, unchanged balance, and the dashboard pending list.',
    skills: ['Date logic', 'Business rules', 'Cross-page validation'],
    expected: 'Status SCHEDULED, heading "Transfer Scheduled", balance unchanged, dashboard pending list shows it.',
    hints: ['Check "Schedule Transfer" and set the date.', 'Balance from GET /api/accounts/CHK-102938.', 'Dashboard list: data-testid="pending-payments".'],
    solution: `${F}

test('scheduled transfer', async ({ page }) => {
  const before = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const amount = Math.floor(Math.random() * 9000) / 100 + 10;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByLabel('Schedule Transfer').check();
  await page.getByLabel('Transfer Date').fill(tomorrow);
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await expect(page.getByTestId('review-when')).toHaveText(tomorrow);
  await page.getByLabel('OTP').fill('123456');
  ${RESPONSE}
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const body = await (await responsePromise).json();
  expect(body).toMatchObject({ status: 'SCHEDULED', scheduledDate: tomorrow });
  await expect(page.getByRole('heading', { name: 'Transfer Scheduled' })).toBeVisible();
  const after = (await (await page.request.get('/api/accounts/CHK-102938')).json()).data.currentBalance;
  expect(after).toBe(before);
  await page.goto('/dashboard');
  await expect(page.getByTestId('pending-payments')).toContainText('Scheduled ' + tomorrow);
});`,
    why: ['Business rules (no debit until the date) must be verified at the data level, not just the UI.'],
  }, L),
  ch({
    id: 104, title: 'Loan + Support End-to-End', category: 'Workflows', page: '/loans',
    description: 'Apply for a loan, raise a support ticket with an attachment, and check notifications.',
    objective: 'Complete both flows through the UI and verify their side effects.',
    skills: ['Multi-page E2E', 'File upload in forms', 'Notifications'],
    expected: 'LOAN- id shown; TKT- id shown; ticket row shows the attachment; notifications include the loan.',
    hints: ['Loan form labels match the field names.', 'Priority is a radio group.', 'Attachment input label: "Attachment".'],
    solution: `${F}

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
  expect(loanId).toMatch(/^LOAN-\\d{6}$/);

  await page.goto('/support');
  await page.getByLabel('Category').selectOption('Loans');
  await page.getByLabel('Subject').fill('Question about ' + loanId);
  await page.getByLabel('Description').fill('Please confirm the documents required for my car loan.');
  await page.getByLabel('High').check();
  await page.getByLabel('Attachment').setInputFiles('sample-files/income-proof.jpg');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByTestId('ticket-id')).toHaveText(/^TKT-\\d{6}$/);
  await expect(page.getByTestId('ticket-row').filter({ hasText: loanId! })).toContainText('income-proof.jpg');

  await page.goto('/notifications');
  await expect(page.getByTestId('notification-item').filter({ hasText: loanId! })).toContainText('under review');
});`,
    why: ['Chaining IDs from one flow into the next proves the flows connect.'],
  }, L),
  ch({
    id: 105, title: 'Secure Banking Payment (Final Challenge)', category: 'Workflows', page: '/transfers',
    description:
      'Login → Dashboard → Transfer Money → Open Secure Payment Gateway → New Popup → Payment iframe → Card Details → Nested OTP iframe → Submit → JavaScript Confirm Dialog → POST /api/payments → JSON Response → Database Update → Transaction Table → Success Toast.',
    objective: 'Automate the complete secure payment flow and validate every layer.',
    skills: ['Authentication', 'Locators', 'Forms', 'Popup', 'iframe', 'Nested iframe', 'Dialog', 'waitForResponse', 'JSON validation', 'Dynamic data', 'Table validation', 'Assertions'],
    expected: '201 payment with PAY- id; DB row matches; main window shows a "Payment Successful" toast and the new row in Latest Transactions.',
    hints: [
      'The gateway is opened from the Transfers page ("Open Secure Payment Gateway") — capture it with page.waitForEvent(\'popup\').',
      'popup.frameLocator(\'[data-testid="payment-frame"]\') → .frameLocator(\'[data-testid="otp-frame"]\'). The confirm() fires on the popup page.',
      'Wait for the response on the popup, then check /api/lab/db/payments?id=… and the main page\'s latest-transactions table.',
    ],
    solution: `${B}

test('Challenge #105 — Secure Banking Payment', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);

  // 2. Dashboard → Transfer Money
  await page.getByRole('button', { name: 'Transfer Money' }).click();
  await expect(page).toHaveURL(/\\/transfers/);

  // 3. Dynamic payment data
  const merchant = 'PW Store ' + Date.now();
  const amount = Math.round((150 + Math.random() * 300) * 100) / 100;
  await page.getByLabel('Merchant').fill(merchant);
  await page.getByLabel('Payment Amount').fill(amount.toFixed(2));

  // 4. New popup
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Secure Payment Gateway' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup.getByRole('heading', { name: 'Secure Payment Gateway' })).toBeVisible();

  // 5. Payment iframe → card details
  const payment = popup.frameLocator('[data-testid="payment-frame"]');
  await payment.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await payment.getByLabel('Expiry Date').fill('12/29');
  await payment.getByLabel('CVV').fill('123');
  await payment.getByLabel('Name on Card').fill('JOHN CARTER');
  await payment.getByRole('button', { name: 'Pay Now' }).click();

  // 6. Nested OTP iframe
  const otp = payment.frameLocator('[data-testid="otp-frame"]');
  await otp.getByLabel('Enter OTP').fill('123456');

  // 7. Confirm dialog + API response
  popup.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain(merchant);
    expect(dialog.message()).toContain('card ending 1111');
    await dialog.accept();
  });
  const responsePromise = popup.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  const response = await responsePromise;

  // 8. JSON validation
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({ success: true, status: 'SUCCESS', merchant, amount, cardLast4: '1111', channel: 'GATEWAY' });
  expect(body.paymentId).toMatch(/^PAY-\\d{6}$/);
  expect(body.transactionId).toMatch(/^TXN-\\d{6}$/);
  await expect(payment.getByTestId('payment-id')).toHaveText(body.paymentId);

  // 9. Database update
  const db = await (await page.request.get('/api/lab/db/payments?id=' + body.paymentId)).json();
  expect(db.rows[0]).toMatchObject({ id: body.paymentId, transaction_id: body.transactionId, amount, status: 'SUCCESS', card_last4: '1111' });

  // 10. Main window: success toast + transaction table
  await expect(page.getByTestId('success-toast').filter({ hasText: 'Payment Successful' })).toContainText(body.paymentId);
  const row = page.getByTestId('latest-transactions').getByTestId('transaction-row').filter({ hasText: body.transactionId });
  await expect(row).toContainText('Gateway Payment - ' + merchant);
  await expect(row).toContainText('-$' + amount.toFixed(2));
  await expect(row).toContainText('Completed');
});`,
    why: [
      'waitForEvent(\'popup\') — the gateway is a real window.open(), so it is a new Page you must capture.',
      'frameLocator — card and OTP forms are in separate, nested documents.',
      "popup.once('dialog') — the confirm() is raised inside the popup's iframe, so it belongs to the popup page.",
      'waitForResponse on the popup — the POST originates from the popup\'s frame.',
      'DB + table checks prove the payment was persisted and propagated back to the opener via postMessage.',
    ],
  }, L),
];
