import { ch, BASE_IMPORT as B, FIXTURE_IMPORT as F, type Challenge } from '../types';

const L = 'advanced' as const;

const CARD = `  await pay.getByLabel('Card Number').fill('4111 1111 1111 1111');
  await pay.getByLabel('Expiry Date').fill('12/29');
  await pay.getByLabel('CVV').fill('123');
  await pay.getByLabel('Name on Card').fill('JOHN CARTER');
  await pay.getByRole('button', { name: 'Pay Now' }).click();`;

export const ADVANCED: Challenge[] = [
  ch({
    id: 56, title: 'Nested iFrames: Card → OTP', category: 'iFrames', page: '/lab/iframes',
    description: 'Main page → payment iframe → OTP iframe → OTP input. Verifying the OTP triggers a confirm() from inside the frame.',
    objective: 'Enter card details, then the OTP inside the nested iframe, accept the confirmation and verify success.',
    skills: ['Nested frameLocator()', 'Dialogs from frames', 'Dynamic IDs'],
    expected: '"Payment Successful" inside the payment frame with a Payment ID like PAY-123456.',
    hints: ["Chain: page.frameLocator('[data-testid=\"nested-payment-frame\"]').frameLocator('[data-testid=\"otp-frame\"]')", 'Dialogs raised inside frames are still emitted on the page.', 'The OTP frame only appears after Pay Now.'],
    solution: `${F}

test('nested iframe OTP payment', async ({ page }) => {
  await page.goto('/lab/iframes');
  const pay = page.frameLocator('[data-testid="nested-payment-frame"]');
${CARD}
  const otp = pay.frameLocator('[data-testid="otp-frame"]');
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('$180.00');
    await dialog.accept();
  });
  await otp.getByLabel('Enter OTP').fill('123456');
  await otp.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(pay.getByText('Payment Successful')).toBeVisible();
  await expect(pay.getByTestId('payment-id')).toHaveText(/^PAY-\\d{6}$/);
});`,
    why: ['frameLocator chains mirror the DOM nesting: each call steps one frame deeper.', 'The confirm() lives in a child frame but Playwright reports it on the page.'],
  }, L),
  ch({
    id: 57, title: 'Locate a Frame by URL', category: 'iFrames', page: '/lab/iframes',
    description: 'page.frame() also matches by URL (string, glob or RegExp).',
    objective: 'Find the iframe pointing to /payment-gateway?mode=simple, pay, and validate the API response.',
    skills: ['page.frame({ url })', 'waitForResponse from frames'],
    expected: 'POST /api/payments returns 201 with merchant "Lab Coffee Shop" and amount 49.99.',
    hints: ['Use a RegExp: /\\/payment-gateway\\?mode=simple/', 'Amounts ≤ $100 skip the OTP step.', 'page.waitForResponse also sees requests from child frames.'],
    solution: `${F}

test('frame by URL', async ({ page }) => {
  await page.goto('/lab/iframes');
  await expect.poll(() => page.frame({ url: /\\/payment-gateway\\?mode=simple/ })).not.toBeNull();
  const frame = page.frame({ url: /\\/payment-gateway\\?mode=simple/ });
  await frame!.getByLabel('Card Number').fill('4111111111111111');
  await frame!.getByLabel('Expiry Date').fill('11/30');
  await frame!.getByLabel('CVV').fill('321');
  await frame!.getByLabel('Name on Card').fill('JOHN CARTER');
  const res = page.waitForResponse((r) => r.url().endsWith('/api/payments') && r.request().method() === 'POST');
  await frame!.getByRole('button', { name: 'Pay Now' }).click();
  const response = await res;
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({ success: true, merchant: 'Lab Coffee Shop', amount: 49.99, channel: 'GATEWAY' });
});`,
    why: ['Matching by URL is robust when frames have no name or test id.'],
  }, L),
  ch({
    id: 58, title: 'Two-Level Frame Tree', category: 'iFrames', page: '/lab/iframes',
    description: 'A frame inside a frame, each with its own inputs.',
    objective: 'Fill the ZIP in level 1 and book an appointment in level 2.',
    skills: ['frameLocator chaining', 'Date inputs in frames'],
    expected: '"Appointment booked for 2026-12-01" inside level 2.',
    hints: ['level-1-frame → level-2-frame', 'Each frame is a separate document.', 'Date inputs take YYYY-MM-DD.'],
    solution: `${F}

test('two-level frames', async ({ page }) => {
  await page.goto('/lab/iframes');
  const level1 = page.frameLocator('[data-testid="level-1-frame"]');
  await level1.getByLabel('ZIP Code').fill('10001');
  const level2 = level1.frameLocator('[data-testid="level-2-frame"]');
  await level2.getByLabel('Appointment Date').fill('2026-12-01');
  await level2.getByRole('button', { name: 'Book Appointment' }).click();
  await expect(level2.getByText('Appointment booked for 2026-12-01')).toBeVisible();
});`,
    why: ['Each frameLocator is lazy; Playwright waits for each frame to attach.'],
  }, L),
  ch({
    id: 59, title: 'Popup: Account Statement', category: 'Popups & Windows', page: '/lab/popups',
    description: 'window.open() creates a new Page object.',
    objective: 'Click "Open Account Statement" and validate the newly opened page.',
    skills: ["waitForEvent('popup')", 'Popup assertions'],
    expected: 'Popup URL /popups/statement, title "Account Statement | ParaBank Pro", heading and table visible.',
    hints: ['Create the popup promise before clicking.', 'await popup.waitForLoadState()', 'The popup is logged in via shared cookies.'],
    solution: `${F}

test('account statement popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Account Statement' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/\\/popups\\/statement/);
  await expect(popup).toHaveTitle('Account Statement | ParaBank Pro');
  await expect(popup.getByRole('heading', { name: 'Account Statement' })).toBeVisible();
  await expect(popup.getByTestId('statement-table')).toBeVisible();
});`,
    why: ['A popup is a full Page — every Page API works on it.'],
  }, L),
  ch({
    id: 60, title: 'Popup: Accept the Bank Policy', category: 'Popups & Windows', page: '/lab/popups',
    description: 'Interact with a popup form.',
    objective: 'Open the Bank Policy, tick the acceptance checkbox and acknowledge.',
    skills: ['Popups', 'toBeDisabled / toBeEnabled'],
    expected: 'Acknowledge is disabled until the box is ticked; then "Policy acknowledged on …" appears.',
    hints: ['Button: "Open Bank Policy".', 'Checkbox label: "I have read and accept the bank policy".', 'Status uses role="status".'],
    solution: `${F}

test('acknowledge policy in popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Bank Policy' }).click();
  const policy = await popupPromise;
  const ack = policy.getByRole('button', { name: 'Acknowledge' });
  await expect(ack).toBeDisabled();
  await policy.getByLabel('I have read and accept the bank policy').check();
  await expect(ack).toBeEnabled();
  await ack.click();
  await expect(policy.getByText(/Policy acknowledged on/)).toBeVisible();
});`,
    why: ['Asserting the disabled state first proves the checkbox gates the action.'],
  }, L),
  ch({
    id: 61, title: 'Multiple Windows', category: 'Popups & Windows', page: '/lab/popups',
    description: 'One click opens three windows.',
    objective: 'Identify each window by URL and title.',
    skills: ["page.on('popup')", 'context.pages()', 'expect.poll'],
    expected: 'Three popups: Account Statement, Bank Policy and Support Portal, each with the right title.',
    hints: ['Collect popups with page.on(\'popup\', p => list.push(p)).', 'Use expect.poll until the list length is 3.', 'Find each popup by url().'],
    solution: `${F}

test('identify multiple windows', async ({ page, context }) => {
  await page.goto('/lab/popups');
  const popups: import('@playwright/test').Page[] = [];
  page.on('popup', (p) => popups.push(p));
  await page.getByRole('button', { name: 'Open All Windows' }).click();
  await expect.poll(() => popups.length).toBe(3);
  const expected: Record<string, string> = {
    '/popups/statement': 'Account Statement | ParaBank Pro',
    '/popups/policy': 'Bank Policy | ParaBank Pro',
    '/popups/support': 'Support Portal | ParaBank Pro',
  };
  for (const [path, title] of Object.entries(expected)) {
    const win = popups.find((p) => p.url().includes(path));
    expect(win, path).toBeDefined();
    await win!.waitForLoadState();
    await expect(win!).toHaveTitle(title);
  }
  expect(context.pages()).toHaveLength(4);
});`,
    why: ['Collecting events avoids races when several windows open at once.', 'context.pages() lists every open page, including the opener.'],
  }, L),
  ch({
    id: 62, title: 'Multiple Tabs', category: 'Popups & Windows', page: '/lab/tabs',
    description: 'Links with target="_blank" open new tabs in the same context.',
    objective: 'Open the Transactions and Support tabs, switch between them and validate content.',
    skills: ["context.waitForEvent('page')", 'bringToFront()'],
    expected: 'Transactions tab shows the transaction table; Support tab shows "Support Tickets"; both logged in.',
    hints: ['New tabs share cookies, so they are already authenticated.', 'Use context.waitForEvent(\'page\').', 'bringToFront() switches the active tab.'],
    solution: `${F}

test('switch between tabs', async ({ page, context }) => {
  await page.goto('/lab/tabs');
  const txPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open Transactions' }).click();
  const txTab = await txPromise;
  await txTab.waitForLoadState();

  await page.bringToFront();
  const supportPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open Support' }).click();
  const supportTab = await supportPromise;

  await txTab.bringToFront();
  await expect(txTab).toHaveURL(/\\/transactions/);
  await expect(txTab.getByTestId('transaction-table')).toBeVisible();
  await supportTab.bringToFront();
  await expect(supportTab.getByRole('heading', { level: 1, name: 'Support Tickets' })).toBeVisible();
  expect(context.pages()).toHaveLength(3);
});`,
    why: ['context-level events catch tabs regardless of which page opened them.'],
  }, L),
  ch({
    id: 63, title: 'Popup Authentication', category: 'Popups & Windows', page: '/lab/popups',
    description: 'The Secure Banking Portal popup has its own login.',
    objective: 'Open the portal, log in as sarah and validate the secure dashboard — without affecting john in the main window.',
    skills: ['Popups', 'Forms in popups', 'Session isolation'],
    expected: 'Popup shows "Secure Dashboard" for Sarah Mitchell; main window still shows John Carter.',
    hints: ['Button: "Open Secure Banking Portal".', 'The portal uses a Bearer token, not the cookie.', 'Check header-username in the main page.'],
    solution: `${F}

test('popup login', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Secure Banking Portal' }).click();
  const portal = await popupPromise;
  await portal.getByLabel('Username').fill('sarah');
  await portal.getByLabel('Password').fill('Demo@123');
  await portal.getByRole('button', { name: 'Login' }).click();
  await expect(portal.getByRole('heading', { name: 'Secure Dashboard' })).toBeVisible();
  await expect(portal.getByTestId('portal-user')).toHaveText('Sarah Mitchell');
  await expect(portal.getByTestId('portal-accounts').getByRole('row')).not.toHaveCount(0);
  await expect(page.getByTestId('header-username')).toHaveText('John Carter');
});`,
    why: ['Asserting the main window afterwards proves the popup did not hijack the session.'],
  }, L),
  ch({
    id: 64, title: 'Close a Popup', category: 'Popups & Windows', page: '/lab/popups',
    description: "Popups can close themselves with window.close().",
    objective: "Open the statement, click 'Close Window' and verify the popup closed while the main page keeps working.",
    skills: ["popup.waitForEvent('close')", 'isClosed()'],
    expected: 'popup.isClosed() is true; the window log in the main page lists "Account Statement → opened".',
    hints: ['Register the close listener before clicking.', 'window.close() works for script-opened windows.', 'Main page log: data-testid="window-log".'],
    solution: `${F}

test('close popup', async ({ page }) => {
  await page.goto('/lab/popups');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open Account Statement' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Account Statement' })).toBeVisible();
  const closed = popup.waitForEvent('close');
  await popup.getByRole('button', { name: 'Close Window' }).click();
  await closed;
  expect(popup.isClosed()).toBe(true);
  await expect(page.getByTestId('window-log')).toContainText('Account Statement → opened');
});`,
    why: ['Waiting for "close" avoids flaky checks of isClosed() immediately after the click.'],
  }, L),
  ch({
    id: 65, title: 'Transaction Details Popup from a Table', category: 'Popups & Windows', page: '/transactions',
    description: 'Each transaction row has a Details button that opens a popup.',
    objective: 'Open details for the first row and verify the popup shows the same transaction ID.',
    skills: ['Row actions', 'Popups', 'getAttribute()'],
    expected: 'Popup title and details contain the row\'s transaction ID.',
    hints: ['Rows expose data-transaction-id.', 'Click the Details button inside the row.', 'Popup title is "<id> | Transaction Details | ParaBank Pro".'],
    solution: `${F}

test('transaction details popup', async ({ page }) => {
  await page.goto('/transactions');
  const row = page.getByTestId('transaction-row').first();
  const id = await row.getAttribute('data-transaction-id');
  const popupPromise = page.waitForEvent('popup');
  await row.getByRole('button', { name: 'Details' }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Transaction Details' })).toBeVisible();
  await expect(popup.getByTestId('transaction-details')).toContainText(id!);
  await expect(popup).toHaveTitle(new RegExp(id!));
});`,
    why: ['Reading the id from the row makes the assertion data-independent.'],
  }, L),
  ch({
    id: 66, title: 'Reuse Auth with storageState', category: 'Authentication', page: '/login',
    description: 'Log in once, save cookies + local storage, reuse them in a new context.',
    objective: 'Save storageState after a UI login and open the dashboard in a fresh context without logging in.',
    skills: ['storageState()', 'browser.newContext()'],
    expected: 'The second context lands directly on the dashboard as John.',
    hints: ['context.storageState({ path }) writes a JSON file.', 'Pass baseURL to browser.newContext().', 'In real suites do this once in a setup project.'],
    solution: `${B}

test('reuse storage state', async ({ browser, baseURL }) => {
  const ctx1 = await browser.newContext({ baseURL });
  const page1 = await ctx1.newPage();
  await page1.goto('/login');
  await page1.getByLabel('Username').fill('john');
  await page1.getByLabel('Password').fill('Demo@123');
  await page1.getByRole('button', { name: 'Login' }).click();
  await expect(page1).toHaveURL(/\\/dashboard/);
  const state = await ctx1.storageState({ path: 'test-results/john-state.json' });
  expect(state.cookies.find((c) => c.name === 'pb_session')).toBeTruthy();

  const ctx2 = await browser.newContext({ baseURL, storageState: 'test-results/john-state.json' });
  const page2 = await ctx2.newPage();
  await page2.goto('/dashboard');
  await expect(page2.getByRole('heading', { name: 'Welcome back, John' })).toBeVisible();
  await ctx1.close();
  await ctx2.close();
});`,
    why: ['storageState skips the login UI in every test — huge speed win.', 'Contexts are isolated: without storageState, ctx2 would be logged out.'],
  }, L),
  ch({
    id: 67, title: 'Inspect Session Cookies', category: 'Authentication', page: '/login',
    description: 'The session lives in an httpOnly cookie.',
    objective: 'Verify the pb_session cookie after login and its removal after logout.',
    skills: ['context.cookies()', 'httpOnly'],
    expected: 'pb_session is httpOnly, matches SES-######-<hex>; gone after logout.',
    hints: ['context.cookies() returns all cookies for the context.', 'httpOnly cookies are invisible to document.cookie.', 'Log out via the user menu.'],
    solution: `${B}

test('session cookie', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);
  const session = (await context.cookies()).find((c) => c.name === 'pb_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.value).toMatch(/^SES-\\d{6}-[0-9a-f]{16}$/);
  expect(await page.evaluate(() => document.cookie)).not.toContain('pb_session');

  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\\/login/);
  expect((await context.cookies()).find((c) => c.name === 'pb_session')).toBeUndefined();
});`,
    why: ['Playwright can read httpOnly cookies that page JavaScript cannot — great for security checks.'],
  }, L),
  ch({
    id: 68, title: 'Local Storage', category: 'Authentication', page: '/login',
    description: 'The app stores the user profile and Remember Me data in localStorage.',
    objective: 'Read and assert localStorage values after logging in with Remember Me.',
    skills: ['page.evaluate()', 'localStorage'],
    expected: 'parabank.user has username "john"; parabank.rememberedUsername is "john".',
    hints: ['page.evaluate(() => localStorage.getItem(key))', 'parabank.user is JSON.', 'storageState() also includes localStorage.'],
    solution: `${B}

test('local storage', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByLabel('Remember Me').check();
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);
  const storage = await page.evaluate(() => ({
    user: JSON.parse(localStorage.getItem('parabank.user') ?? 'null'),
    remembered: localStorage.getItem('parabank.rememberedUsername'),
  }));
  expect(storage.user).toMatchObject({ username: 'john', role: 'CUSTOMER', customerId: expect.stringMatching(/^CUS-/) });
  expect(storage.remembered).toBe('john');
});`,
    why: ['evaluate() runs in the browser — return plain JSON to the test.'],
  }, L),
  ch({
    id: 69, title: 'Session Expiration', category: 'Authentication', page: '/lab',
    description: 'Expired sessions must send the user back to login with a clear message.',
    objective: 'Use "Expire Session" in the lab and verify the redirect and message.',
    skills: ['Confirm dialogs', 'Session handling', 'Redirects'],
    expected: 'Redirect to /login with "Your session has expired. Please log in again."',
    hints: ['The button asks for confirmation first.', 'The API then returns 401 SESSION_EXPIRED.', 'data-testid="session-message"'],
    solution: `${F}

test('expired session redirects to login', async ({ page }) => {
  await page.goto('/lab');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Expire Session' }).click();
  await expect(page).toHaveURL(/\\/login/);
  await expect(page.getByTestId('session-message')).toHaveText('Your session has expired. Please log in again.');
  const res = await page.request.get('/api/accounts');
  expect(res.status()).toBe(401);
  expect((await res.json()).errorCode).toBe('SESSION_EXPIRED');
});`,
    why: ['Verifying the API code proves it was an expiry, not a generic logout.'],
  }, L),
  ch({
    id: 70, title: 'Validate the Transfer API Response', category: 'API', page: '/transfers',
    description: 'Perform a transfer through the UI and validate the API response.',
    objective: 'Capture POST /api/transfers with waitForResponse and validate status and JSON.',
    skills: ['waitForResponse', 'response.json()', 'Dynamic data'],
    expected: '201 Created; success true; transactionId TXN-######; UI shows the same ID.',
    hints: ['"Amount" also matches "Payment Amount" — use exact.', 'OTP is 123456.', 'Random amounts avoid DUPLICATE_TRANSFER.'],
    solution: `${F}

test('transfer API response', async ({ page }) => {
  const amount = Math.floor(Math.random() * 9000) / 100 + 1;
  await page.goto('/transfers');
  await page.getByLabel('Amount', { exact: true }).fill(amount.toFixed(2));
  await page.getByRole('button', { name: 'Review Transfer' }).click();
  await page.getByLabel('OTP').fill('123456');
  const responsePromise = page.waitForResponse((r) => r.url().includes('/api/transfers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Transfer' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.transactionId).toMatch(/^TXN-\\d{6}$/);
  expect(body.amount).toBe(Number(amount.toFixed(2)));
  expect(body.status).toBe('COMPLETED');
  await expect(page.getByTestId('transfer-transaction-id')).toHaveText(body.transactionId);
});`,
    why: ['waitForResponse gives you the exact JSON the UI received, so UI and API assertions stay in sync.'],
  }, L),
  ch({
    id: 71, title: 'Validate a GET Response on Page Load', category: 'API', page: '/accounts',
    description: 'Capture the response the page requests while loading.',
    objective: 'Validate GET /api/accounts and compare it with the rendered rows.',
    skills: ['waitForResponse before goto', 'Schema-like checks'],
    expected: 'Each account matches the ID pattern and currency USD; UI row count equals data length.',
    hints: ['Start waiting before page.goto().', "Glob: '**/api/accounts'", 'Use expect.objectContaining for shape checks.'],
    solution: `${F}

test('accounts response shape', async ({ page }) => {
  const res = page.waitForResponse('**/api/accounts');
  await page.goto('/accounts');
  const body = await (await res).json();
  expect(body.success).toBe(true);
  for (const a of body.data) {
    expect(a).toEqual(expect.objectContaining({
      accountNumber: expect.stringMatching(/^(CHK|SAV|CRD)-\\d{6}$/),
      accountType: expect.stringMatching(/^(CHECKING|SAVINGS|CREDIT)$/),
      currency: 'USD',
      status: 'ACTIVE',
      currentBalance: expect.any(Number),
    }));
  }
  await expect(page.getByTestId('account-row')).toHaveCount(body.data.length);
});`,
    why: ['Asymmetric matchers validate structure without hard-coding values.'],
  }, L),
  ch({
    id: 72, title: 'API Testing with APIRequestContext', category: 'API', page: '/api-docs',
    description: 'Test the REST API directly — no browser needed.',
    objective: 'Log in via POST /api/auth/login, then call GET /api/accounts with a Bearer token.',
    skills: ['request fixture', 'Bearer auth', '401 checks'],
    expected: '200 with accounts when authorised; 401 UNAUTHORIZED without credentials.',
    hints: ['Use the built-in request fixture.', 'The login response contains sessionId.', 'Header: Authorization: Bearer <sessionId>.'],
    solution: `${B}

test('API login and accounts', async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const login = await api.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123', issueCookie: false } });
  expect(login.ok()).toBeTruthy();
  const { sessionId, userId } = await login.json();
  expect(userId).toBe('USR-102938');

  const anon = await api.get('/api/accounts');
  expect(anon.status()).toBe(401);
  expect((await anon.json()).errorCode).toBe('UNAUTHORIZED');

  const accounts = await api.get('/api/accounts', { headers: { Authorization: 'Bearer ' + sessionId } });
  expect(accounts.status()).toBe(200);
  expect((await accounts.json()).count).toBeGreaterThanOrEqual(3);
  await api.dispose();
});`,
    why: ['A fresh request context has no cookies, so the 401 check is reliable.', 'issueCookie: false keeps the test purely token-based.'],
  }, L),
  ch({
    id: 73, title: 'API Negative Tests', category: 'API', page: '/api-docs',
    description: 'Verify error contracts of POST /api/transfers.',
    objective: 'Check INVALID_OTP (400), INSUFFICIENT_BALANCE (422) and INVALID_ACCOUNT (404).',
    skills: ['Data-driven API tests', 'Error contracts'],
    expected: 'Each case returns the documented status and errorCode with success:false.',
    hints: ['page.request shares the fixture\'s session cookie.', 'Loop over a table of cases.', 'Amount 99,999,999 is above any balance (and the limit).'],
    solution: `${F}

const cases = [
  { name: 'invalid OTP', body: { amount: 5, otp: '000000' }, status: 400, code: 'INVALID_OTP' },
  { name: 'insufficient', body: { amount: 999999, otp: '123456' }, status: 422, code: 'INSUFFICIENT_BALANCE' },
  { name: 'invalid account', body: { amount: 5, otp: '123456', toAccount: 'SAV-000000' }, status: 404, code: 'INVALID_ACCOUNT' },
];

for (const c of cases) {
  test('transfer error: ' + c.name, async ({ page }) => {
    const res = await page.request.post('/api/transfers', {
      data: { fromAccount: 'CHK-102938', toAccount: 'SAV-827364', ...c.body },
    });
    expect(res.status()).toBe(c.status);
    expect(await res.json()).toMatchObject({ success: false, errorCode: c.code });
  });
}`,
    why: ['Parameterised tests document the whole error contract in one place.'],
  }, L),
  ch({
    id: 74, title: 'Intercept a GET Request', category: 'Network', page: '/lab/network',
    description: 'page.route() sees every matching request.',
    objective: 'Count GET /api/accounts requests made when clicking "Load Accounts", letting them continue.',
    skills: ['page.route()', 'route.continue()'],
    expected: 'Exactly one intercepted GET; the account list still renders.',
    hints: ["Glob '**/api/accounts' does not match /api/accounts/CHK-…", 'Call route.continue() to let it through.', 'Assert the method inside the handler.'],
    solution: `${F}

test('intercept GET', async ({ page }) => {
  let intercepted = 0;
  await page.route('**/api/accounts', async (route) => {
    expect(route.request().method()).toBe('GET');
    intercepted++;
    await route.continue();
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toBeVisible();
  expect(intercepted).toBe(1);
});`,
    why: ['route.continue() passes the request through unchanged — pure observation.'],
  }, L),
  ch({
    id: 75, title: 'Mock a Response', category: 'Network', page: '/lab/network',
    description: 'Replace the real API response with your own data.',
    objective: 'Mock GET /api/accounts with a single "MOCK-000001" account worth $1,000,000.',
    skills: ['route.fulfill({ json })'],
    expected: 'The UI shows exactly one account MOCK-000001 with $1,000,000.00.',
    hints: ['route.fulfill accepts a json option.', 'The UI reads data[].accountNumber and currentBalance.', 'No request reaches the server.'],
    solution: `${F}

test('mock accounts', async ({ page }) => {
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: { success: true, count: 1, data: [{ accountNumber: 'MOCK-000001', accountType: 'SAVINGS', currentBalance: 1_000_000, availableBalance: 1_000_000, currency: 'USD', status: 'ACTIVE' }] },
    }),
  );
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  const accounts = page.getByTestId('network-account');
  await expect(accounts).toHaveCount(1);
  await expect(accounts).toContainText('MOCK-000001');
  await expect(accounts).toContainText('$1,000,000.00');
});`,
    why: ['Mocks let you test UI states (huge balances, empty lists) that are hard to create for real.'],
  }, L),
  ch({
    id: 76, title: 'Modify a Request Body', category: 'Network', page: '/lab/network',
    description: 'The echo endpoint returns exactly what it received.',
    objective: 'Change amount from 100 to 999 in the outgoing POST /api/lab/echo body.',
    skills: ['route.continue({ postData })', 'postDataJSON()'],
    expected: 'The echoed body shows "amount": 999.',
    hints: ['Read the original with route.request().postDataJSON().', 'Send a JSON string as postData.', 'Echo result has data-testid="echo-result".'],
    solution: `${F}

test('modify POST body', async ({ page }) => {
  await page.route('**/api/lab/echo', async (route) => {
    const original = route.request().postDataJSON();
    expect(original.amount).toBe(100);
    await route.continue({ postData: JSON.stringify({ ...original, amount: 999 }) });
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Send Echo Request' }).click();
  await expect(page.getByTestId('echo-result')).toContainText('"amount": 999');
});`,
    why: ['Modifying requests tests how the server handles inputs the UI would never send.'],
  }, L),
  ch({
    id: 77, title: 'Add a Request Header', category: 'Network', page: '/lab/network',
    description: 'Inject headers such as correlation IDs or feature flags.',
    objective: 'Add "x-test-run: pw-77" to the echo request and verify the server received it.',
    skills: ['route.continue({ headers })'],
    expected: 'The page shows "x-test-run: pw-77".',
    hints: ['Spread the original headers.', 'Header names are lower-case.', 'data-testid="echo-custom-header"'],
    solution: `${F}

test('inject header', async ({ page }) => {
  await page.route('**/api/lab/echo', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-test-run': 'pw-77' } }),
  );
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Send Echo Request' }).click();
  await expect(page.getByTestId('echo-custom-header')).toHaveText('x-test-run: pw-77');
});`,
    why: ['Keeping the original headers avoids dropping cookies or content-type.'],
  }, L),
  ch({
    id: 78, title: 'Block a Request', category: 'Network', page: '/lab/network',
    description: 'Simulate a dead third-party service.',
    objective: 'Abort GET /api/lab/fx-rates and verify the network error UI.',
    skills: ['route.abort()'],
    expected: 'The FX panel shows the network error message.',
    hints: ['route.abort() fails the request at the network layer.', 'fetch() then rejects — the app shows NETWORK_ERROR.', 'data-testid="network-fx-error"'],
    solution: `${F}

test('block fx rates', async ({ page }) => {
  await page.route('**/api/lab/fx-rates', (route) => route.abort());
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load FX Rates' }).click();
  await expect(page.getByTestId('network-fx-error')).toContainText('Network error');
});`,
    why: ['abort() is the most realistic way to test offline / DNS / firewall failures.'],
  }, L),
  ch({
    id: 79, title: 'Delay a Response', category: 'Network', page: '/lab/network',
    description: 'Slow networks reveal loading states.',
    objective: 'Delay GET /api/accounts by 2 seconds and assert the loading indicator appears then disappears.',
    skills: ['Async route handlers', 'Loading states'],
    expected: '"Loading accounts..." is visible, then the account list replaces it.',
    hints: ['await new Promise(r => setTimeout(r, 2000)) inside the handler.', 'data-testid="loading-indicator"', 'toBeHidden waits for it to go away.'],
    solution: `${F}

test('delayed response shows loader', async ({ page }) => {
  await page.route('**/api/accounts', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  const loader = page.getByTestId('loading-indicator');
  await expect(loader).toHaveText('Loading accounts...');
  await expect(loader).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('network-account').first()).toBeVisible();
});`,
    why: ['Controlling latency makes loading-state tests deterministic.'],
  }, L),
  ch({
    id: 80, title: 'Change a Real Response', category: 'Network', page: '/lab/network',
    description: 'Fetch the real response, tweak one field, and return it.',
    objective: 'Change the first account balance to 123456.78 using route.fetch().',
    skills: ['route.fetch()', 'route.fulfill({ response, json })'],
    expected: 'The first account shows $123,456.78; others keep real values.',
    hints: ['const response = await route.fetch();', 'const json = await response.json();', 'route.fulfill({ response, json })'],
    solution: `${F}

test('patch real response', async ({ page }) => {
  await page.route('**/api/accounts', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data[0].currentBalance = 123456.78;
    await route.fulfill({ response, json });
  });
  await page.goto('/lab/network');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toContainText('$123,456.78');
});`,
    why: ['Patching keeps the rest of the payload realistic while forcing one edge case.'],
  }, L),
  ch({
    id: 81, title: 'Validate a Request Payload', category: 'Network', page: '/payments',
    description: 'Assert what the UI sends, not just what it shows.',
    objective: 'Pay an Electricity bill and validate the POST /api/payments payload.',
    skills: ['waitForRequest', 'postDataJSON()'],
    expected: 'Payload includes biller "Electricity", customerNumber, amount 42.5 and an account ID.',
    hints: ['page.waitForRequest(predicate)', 'Form values are sent as strings — compare with Number().', 'Customer number must be 4-20 characters.'],
    solution: `${F}

test('payment payload', async ({ page }) => {
  await page.goto('/payments');
  await page.getByLabel('Biller').selectOption('Electricity');
  await page.getByLabel('Customer Number').fill('ELE123456');
  await page.getByLabel('Amount').fill('42.50');
  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/payments') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Pay Bill' }).click();
  const payload = (await requestPromise).postDataJSON();
  expect(payload).toMatchObject({ biller: 'Electricity', customerNumber: 'ELE123456' });
  expect(Number(payload.amount)).toBe(42.5);
  expect(payload.accountId).toMatch(/^(CHK|SAV|CRD)-\\d{6}$/);
  await expect(page.getByTestId('payment-id')).toHaveText(/^PAY-\\d{6}$/);
});`,
    why: ['Request assertions catch bugs where the UI looks right but sends the wrong data.'],
  }, L),
  ch({
    id: 82, title: 'Server-side Failure Injection', category: 'Network', page: '/lab/network',
    description: 'Make the real server return 500 for an endpoint.',
    objective: 'Enable a 500 on /api/accounts, verify the error UI, clear it and verify recovery.',
    skills: ['Error states', 'Recovery'],
    expected: 'INTERNAL_SERVER_ERROR shown first, account list after clearing.',
    hints: ['Labels: "Failure Mode", "Endpoint" (exact), "HTTP Method".', 'Settings are per browser context (cookie pb_lab).', 'Button: "Clear All Simulations".'],
    solution: `${F}

test('inject 500 and recover', async ({ page }) => {
  await page.goto('/lab/network');
  await page.getByLabel('Failure Mode').selectOption('500');
  await page.getByLabel('Endpoint', { exact: true }).selectOption('/api/accounts');
  await page.getByRole('button', { name: 'Enable Failure' }).click();
  await expect(page.getByTestId('simulation-config')).toContainText('Failure: 500');

  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-accounts-error')).toContainText('INTERNAL_SERVER_ERROR');

  await page.getByRole('button', { name: 'Clear All Simulations' }).click();
  await expect(page.getByTestId('simulation-config')).toContainText('No simulations active');
  await page.getByRole('button', { name: 'Load Accounts' }).click();
  await expect(page.getByTestId('network-account').first()).toBeVisible();
});`,
    why: ['Server-side injection tests the full stack, including real HTTP error responses.'],
  }, L),
  ch({
    id: 83, title: 'Dynamic Data', category: 'API', page: '/lab/network',
    description: 'FX quotes change on every request.',
    objective: 'Load FX rates twice and verify the quote IDs differ but follow the pattern.',
    skills: ['Regex assertions', 'Comparing dynamic values'],
    expected: 'Two different quote IDs matching /^FX-\\d{6}$/; EUR rate between 0.8 and 1.1.',
    hints: ['data-testid="fx-quote-id"', 'Use not.toHaveText(previous) to wait for a change.', 'Parse the rate with Number().'],
    solution: `${F}

test('dynamic fx quote', async ({ page }) => {
  await page.goto('/lab/network');
  const load = page.getByRole('button', { name: 'Load FX Rates' });
  const quote = page.getByTestId('fx-quote-id');
  await load.click();
  await expect(quote).toHaveText(/^FX-\\d{6}$/);
  const first = await quote.textContent();
  await load.click();
  await expect(quote).not.toHaveText(first!);
  await expect(quote).toHaveText(/^FX-\\d{6}$/);
  const eur = Number(await page.getByTestId('fx-EUR').textContent());
  expect(eur).toBeGreaterThan(0.8);
  expect(eur).toBeLessThan(1.1);
});`,
    why: ['Assert ranges and patterns, not exact values, when data is generated per request.'],
  }, L),
  ch({
    id: 84, title: 'Response Headers', category: 'API', page: '/accounts',
    description: 'Every API response carries tracing headers.',
    objective: 'Validate X-Request-Id, X-Response-Time, Content-Type and Cache-Control.',
    skills: ['response.headers()', 'Header assertions'],
    expected: 'x-request-id matches REQ-XXXXXXXX; cache-control is no-store; content-type is JSON.',
    hints: ['Header names are lower-cased by Playwright.', 'X-Response-Time ends with "ms".', 'Capture with waitForResponse.'],
    solution: `${F}

test('response headers', async ({ page }) => {
  const res = page.waitForResponse('**/api/accounts');
  await page.goto('/accounts');
  const headers = (await res).headers();
  expect(headers['x-request-id']).toMatch(/^REQ-[0-9A-F]{8}$/);
  expect(headers['x-response-time']).toMatch(/^[\\d.]+ms$/);
  expect(headers['content-type']).toContain('application/json');
  expect(headers['cache-control']).toBe('no-store');
});`,
    why: ['Headers are part of the API contract and often break silently.'],
  }, L),
  ch({
    id: 85, title: 'Download and Parse a CSV', category: 'Files', page: '/lab/download',
    description: 'Validate the contents of a downloaded report.',
    objective: 'Download the failed-transactions CSV and verify every row is Failed and the count matches the API.',
    skills: ['Download content', 'CSV parsing', 'API cross-check'],
    expected: 'Header row present; every data row contains ",Failed,"; row count equals API total.',
    hints: ['Link: "Download Failed Transactions".', 'Read the file with fs.readFileSync(path, \'utf8\').', 'API: GET /api/transactions?status=Failed&pageSize=1 → pagination.total'],
    solution: `${F}
import fs from 'node:fs';

test('failed transactions CSV', async ({ page }) => {
  await page.goto('/lab/download');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Failed Transactions' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^transaction-report-\\d{4}-\\d{2}-\\d{2}\\.csv$/);
  const lines = fs.readFileSync((await download.path())!, 'utf8').trim().split('\\n');
  expect(lines[0]).toBe('Transaction ID,Date,Description,Type,Amount,Direction,Account,Status,Balance After');
  const rows = lines.slice(1);
  for (const row of rows) expect(row).toContain(',Failed,');
  const api = await (await page.request.get('/api/transactions?status=Failed&pageSize=1')).json();
  expect(rows).toHaveLength(api.pagination.total);
});`,
    why: ['Cross-checking file content with the API proves the export is complete and correct.'],
  }, L),
];
