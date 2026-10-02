import { ch, BASE_IMPORT as B, FIXTURE_IMPORT as F, type Challenge } from '../types';

const L = 'beginner' as const;

const LOGIN_STEPS = `  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);`;

export const BEGINNER: Challenge[] = [
  ch({
    id: 1, title: 'Open the Login Page', category: 'Authentication', page: '/login',
    description: 'Every test starts with navigation. Open the login page and confirm you landed on the right page.',
    objective: 'Navigate to /login and verify the page title and the "Welcome back" heading.',
    skills: ['page.goto()', 'toHaveTitle', 'getByRole(heading)'],
    expected: 'Title contains "ParaBank Pro" and the heading "Welcome back" is visible.',
    hints: ['baseURL is configured, so page.goto(\'/login\') is enough.', 'Use expect(page).toHaveTitle(/ParaBank Pro/).', "getByRole('heading', { name: 'Welcome back' })"],
    solution: `${B}

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/ParaBank Pro/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
});`,
    why: ['getByRole(heading) checks what a user actually sees and survives CSS refactors.', 'Web-first assertions like toHaveTitle retry automatically until they pass or time out.'],
  }, L),
  ch({
    id: 2, title: 'Valid Login', category: 'Authentication', page: '/login',
    description: 'Log in with the practice customer account.',
    objective: 'Log in as john / Demo@123 and verify you reach the dashboard.',
    skills: ['getByLabel()', 'fill()', 'click()', 'toHaveURL'],
    expected: 'URL ends with /dashboard and the heading reads "Welcome back, John".',
    hints: ['Inputs have real <label> elements — use getByLabel().', 'The submit button is named "Login".', 'Assert the URL with a regex: /\\/dashboard/.'],
    solution: `${B}

test('valid login', async ({ page }) => {
${LOGIN_STEPS}
  await expect(page.getByRole('heading', { name: 'Welcome back, John' })).toBeVisible();
  await expect(page.getByTestId('customer-name')).toHaveText('John Carter');
});`,
    why: ['getByLabel ties the input to its visible label, exactly like a screen-reader user.', 'toHaveURL waits for the client-side redirect after login.'],
  }, L),
  ch({
    id: 3, title: 'Invalid Password', category: 'Authentication', page: '/login',
    description: 'Negative testing: the server rejects a wrong password with a specific error.',
    objective: 'Log in as john with a wrong password and validate the error message.',
    skills: ['Negative testing', 'getByTestId()', 'toContainText'],
    expected: 'Error "The password you entered is incorrect." with code INVALID_PASSWORD is shown; URL stays on /login.',
    hints: ['The error box has data-testid="login-error".', 'The error code is displayed under the message.', 'Also assert you did NOT navigate away.'],
    solution: `${B}

test('invalid password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();
  const error = page.getByTestId('login-error');
  await expect(error).toContainText('The password you entered is incorrect.');
  await expect(error).toContainText('INVALID_PASSWORD');
  await expect(page).toHaveURL(/\\/login/);
});`,
    why: ['A test id is fine for an error container that has no stable role/text.', 'Checking the URL proves the login really failed.'],
  }, L),
  ch({
    id: 4, title: 'Invalid Username', category: 'Authentication', page: '/login',
    description: 'Unknown usernames return a different error than wrong passwords.',
    objective: 'Log in as "nobody" and verify the INVALID_USERNAME error.',
    skills: ['Negative testing', 'toContainText'],
    expected: '"No account was found with that username." is displayed.',
    hints: ['Same form as before, different username.', 'Assert both message and error code.', 'getByTestId(\'login-error\')'],
    solution: `${B}

test('invalid username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('nobody');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByTestId('login-error')).toContainText('No account was found with that username.');
  await expect(page.getByTestId('login-error')).toContainText('INVALID_USERNAME');
});`,
    why: ['Separate tests for each negative path keep failures easy to diagnose.'],
  }, L),
  ch({
    id: 5, title: 'Empty Username', category: 'Forms', page: '/login',
    description: 'Client-side validation stops the form before the API is called.',
    objective: 'Submit with only a password and verify the "Username is required" message.',
    skills: ['Form validation', 'getByText()', 'toHaveAttribute'],
    expected: '"Username is required" is shown and the username input has aria-invalid="true".',
    hints: ['Leave the Username field empty.', 'getByText(\'Username is required\')', 'Invalid inputs set aria-invalid="true".'],
    solution: `${B}

test('empty username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Username is required')).toBeVisible();
  await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true');
});`,
    why: ['aria-invalid is the accessible signal for an invalid field — great to assert on.'],
  }, L),
  ch({
    id: 6, title: 'Empty Password', category: 'Forms', page: '/login',
    description: 'Same as before, but for the password field.',
    objective: 'Submit with only a username and verify "Password is required".',
    skills: ['Form validation', 'getByText()'],
    expected: '"Password is required" is visible; no request was sent to /api/auth/login.',
    hints: ['Fill only the username.', 'You can listen with page.on(\'request\') to prove no API call happened.', 'Use a counter variable.'],
    solution: `${B}

test('empty password', async ({ page }) => {
  let loginCalls = 0;
  page.on('request', (r) => { if (r.url().includes('/api/auth/login')) loginCalls++; });
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Password is required')).toBeVisible();
  expect(loginCalls).toBe(0);
});`,
    why: ['Listening to requests lets you prove the client-side validation short-circuited the API call.'],
  }, L),
  ch({
    id: 7, title: 'Locked User', category: 'Authentication', page: '/login',
    description: 'Some accounts are locked by the bank.',
    objective: 'Log in as locked / Demo@123 and verify the locked-account message.',
    skills: ['Negative testing', 'toContainText'],
    expected: '"Your account has been locked. Please contact customer support." (ACCOUNT_LOCKED) is shown.',
    hints: ['Username: locked', 'Password is the normal demo password.', 'The server returns HTTP 423.'],
    solution: `${B}

test('locked user cannot log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('locked');
  await page.getByLabel('Password').fill('Demo@123');
  const response = page.waitForResponse('**/api/auth/login');
  await page.getByRole('button', { name: 'Login' }).click();
  expect((await response).status()).toBe(423);
  await expect(page.getByTestId('login-error')).toContainText('Your account has been locked');
});`,
    why: ['Asserting the HTTP status alongside the UI message catches mismatches between backend and frontend.'],
  }, L),
  ch({
    id: 8, title: 'Logout', category: 'Authentication', page: '/dashboard',
    description: 'Log out from the user menu in the header.',
    objective: 'Open the user menu, click Logout and verify you are back on the login page.',
    skills: ['getByRole(menuitem)', 'toHaveURL'],
    expected: 'URL is /login and "You have been logged out successfully." is shown.',
    hints: ['The avatar button has data-testid="user-menu".', 'Menu entries have role="menuitem".', 'The confirmation has data-testid="session-message".'],
    solution: `${F}

test('logout', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\\/login/);
  await expect(page.getByTestId('session-message')).toHaveText('You have been logged out successfully.');
});`,
    why: ['The fixture logs in through the API, so this test only exercises logout.'],
  }, L),
  ch({
    id: 9, title: 'Remember Me', category: 'Forms', page: '/login',
    description: 'Remember Me stores your username for the next visit.',
    objective: 'Log in with Remember Me checked, log out, and verify the username is pre-filled.',
    skills: ['check()', 'toBeChecked', 'toHaveValue'],
    expected: 'After logout the Username field contains "john" and Remember Me is still checked.',
    hints: ['getByLabel(\'Remember Me\').check()', 'Log out through the user menu.', 'toHaveValue(\'john\')'],
    solution: `${B}

test('remember me pre-fills username', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('john');
  await page.getByLabel('Password').fill('Demo@123');
  await page.getByLabel('Remember Me').check();
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page.getByLabel('Username')).toHaveValue('john');
  await expect(page.getByLabel('Remember Me')).toBeChecked();
});`,
    why: ['check() is idempotent — it only clicks if the box is not already checked.'],
  }, L),
  ch({
    id: 10, title: 'Show / Hide Password', category: 'Locators', page: '/login',
    description: 'A toggle reveals the password text.',
    objective: 'Verify the password input switches between type="password" and type="text".',
    skills: ['toHaveAttribute', 'getByRole(button)'],
    expected: 'type becomes "text" after clicking Show, and "password" again after clicking Hide.',
    hints: ['The toggle button is named "Show" (then "Hide").', 'Assert the input\'s type attribute.', 'The button name changes after clicking.'],
    solution: `${B}

test('toggle password visibility', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('Password');
  await password.fill('Demo@123');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});`,
    why: ['Locators are lazy — the same `password` locator is re-resolved after every re-render.'],
  }, L),
  ch({
    id: 11, title: 'Forgot Password', category: 'Forms', page: '/forgot-password',
    description: 'Follow the Forgot Password link and request reset instructions.',
    objective: 'Submit the form and verify a reset reference like RST-123456 is shown.',
    skills: ['getByRole(link)', 'Regex assertions'],
    expected: 'A success message containing a reference matching /RST-\\d{6}/.',
    hints: ['The link text is "Forgot Password?".', 'Field label: "Username or Email".', 'toContainText accepts a RegExp.'],
    solution: `${B}

test('forgot password', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot Password?' }).click();
  await expect(page).toHaveURL(/\\/forgot-password/);
  await page.getByLabel('Username or Email').fill('john');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByTestId('forgot-result')).toContainText(/RST-\\d{6}/);
});`,
    why: ['Dynamic values (reference IDs) should be asserted by pattern, not by exact value.'],
  }, L),
  ch({
    id: 12, title: 'Sidebar Navigation', category: 'Locators', page: '/dashboard',
    description: 'Navigate with the sidebar.',
    objective: 'Click "Accounts" in the main navigation and verify the Accounts page.',
    skills: ['Scoped locators', 'getByRole(navigation)', 'toHaveURL'],
    expected: 'URL is /accounts and the H1 is "Accounts".',
    hints: ['The sidebar nav is labelled "Main navigation".', 'Scope: page.getByRole(\'navigation\', { name: \'Main navigation\' }).getByRole(\'link\', ...)', 'Headings accept a level option.'],
    solution: `${F}

test('sidebar navigation', async ({ page }) => {
  await page.goto('/dashboard');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Accounts', exact: true }).click();
  await expect(page).toHaveURL(/\\/accounts$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Accounts' })).toBeVisible();
});`,
    why: ['Scoping to the navigation landmark avoids matching other "Accounts" links on the page.', 'exact: true avoids matching "My Accounts".'],
  }, L),
  ch({
    id: 13, title: 'Verify Customer ID', category: 'Locators', page: '/dashboard',
    description: 'The dashboard shows the customer name and ID.',
    objective: 'Verify the customer ID format and value.',
    skills: ['getByTestId()', 'toHaveText with RegExp'],
    expected: 'Customer ID matches /^CUS-\\d{6}$/ (CUS-100001 for the canonical seed).',
    hints: ['data-testid="customer-id"', 'Use a RegExp so the test still works with generated data.', 'Customer name has data-testid="customer-name".'],
    solution: `${F}

test('customer id on dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('customer-id')).toHaveText(/^CUS-\\d{6}$/);
  await expect(page.getByTestId('customer-name')).toHaveText('John Carter');
});`,
    why: ['A regex keeps the test valid after "Generate New Test Data".'],
  }, L),
  ch({
    id: 14, title: 'Balance Cards', category: 'Locators', page: '/dashboard',
    description: 'Four cards show total, checking, savings and credit balances.',
    objective: 'Verify each balance card is visible and shows a dollar amount.',
    skills: ['Loops', 'getByTestId()', 'toContainText'],
    expected: 'total-balance, checking-balance, savings-balance and credit-balance all contain "$".',
    hints: ['Loop over an array of test ids.', 'Amounts are formatted like $12,345.67.', 'Use a RegExp: /\\$[\\d,]+\\.\\d{2}/'],
    solution: `${F}

test('balance cards', async ({ page }) => {
  await page.goto('/dashboard');
  for (const id of ['total-balance', 'checking-balance', 'savings-balance', 'credit-balance']) {
    await expect(page.getByTestId(id)).toContainText(/\\$[\\d,]+\\.\\d{2}/);
  }
});`,
    why: ['Data-driven loops keep repetitive assertions compact.'],
  }, L),
  ch({
    id: 15, title: 'Count Quick Actions', category: 'Locators', page: '/dashboard',
    description: 'The Quick Actions panel contains seven buttons.',
    objective: 'Count the buttons inside the Quick Actions region.',
    skills: ['getByRole(region)', 'toHaveCount'],
    expected: 'Exactly 7 buttons: Transfer Money, Pay Bill, Deposit, Withdraw, Apply Loan, Manage Cards, View Transactions.',
    hints: ['A <section> with a heading becomes a "region" landmark.', 'Chain .getByRole(\'button\').', 'toHaveText accepts an array for multiple elements.'],
    solution: `${F}

test('quick actions', async ({ page }) => {
  await page.goto('/dashboard');
  const buttons = page.getByRole('region', { name: 'Quick Actions' }).getByRole('button');
  await expect(buttons).toHaveCount(7);
  await expect(buttons).toHaveText(['Transfer Money', 'Pay Bill', 'Deposit', 'Withdraw', 'Apply Loan', 'Manage Cards', 'View Transactions']);
});`,
    why: ['toHaveText with an array asserts count, order and text in one retrying assertion.'],
  }, L),
  ch({
    id: 16, title: 'Select a Biller (Dropdown)', category: 'Forms', page: '/payments',
    description: 'Native <select> elements are handled with selectOption().',
    objective: 'Select "Electricity" in the Biller dropdown.',
    skills: ['selectOption()', 'toHaveValue'],
    expected: 'The Biller select has value "Electricity".',
    hints: ['getByLabel(\'Biller\')', 'selectOption() accepts a value or a label.', 'Assert with toHaveValue.'],
    solution: `${F}

test('select biller', async ({ page }) => {
  await page.goto('/payments');
  const biller = page.getByLabel('Biller');
  await biller.selectOption('Electricity');
  await expect(biller).toHaveValue('Electricity');
});`,
    why: ['selectOption waits for the option to exist, so it works even while billers are still loading.'],
  }, L),
  ch({
    id: 17, title: 'Radio Buttons: Transfer Type', category: 'Forms', page: '/transfers',
    description: 'Choosing the transfer type swaps the destination field.',
    objective: 'Select the "Beneficiary" radio and verify the Beneficiary dropdown replaces "To Account".',
    skills: ['getByRole(radio)', 'check()', 'toBeHidden'],
    expected: 'Beneficiary combobox visible, To Account combobox hidden.',
    hints: ['There is a radio AND a select named Beneficiary — use roles to tell them apart.', "getByRole('radio', { name: 'Beneficiary' })", "getByRole('combobox', { name: 'Beneficiary' })"],
    solution: `${F}

test('transfer type radio', async ({ page }) => {
  await page.goto('/transfers');
  await expect(page.getByRole('combobox', { name: 'To Account' })).toBeVisible();
  await page.getByRole('radio', { name: 'Beneficiary' }).check();
  await expect(page.getByRole('radio', { name: 'Beneficiary' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Beneficiary' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'To Account' })).toBeHidden();
});`,
    why: ['Roles disambiguate elements that share the same accessible name.'],
  }, L),
  ch({
    id: 18, title: 'Checkbox Enables Date Picker', category: 'Forms', page: '/transfers',
    description: 'The transfer date is only editable when "Schedule Transfer" is checked.',
    objective: 'Verify the date input is disabled, check the box, then fill a date.',
    skills: ['toBeDisabled', 'toBeEnabled', 'Date inputs'],
    expected: 'Transfer Date becomes enabled and accepts an ISO date.',
    hints: ['Date inputs take YYYY-MM-DD with fill().', 'getByLabel(\'Schedule Transfer\')', 'Compute tomorrow with new Date().'],
    solution: `${F}

test('schedule checkbox enables date', async ({ page }) => {
  await page.goto('/transfers');
  const date = page.getByLabel('Transfer Date');
  await expect(date).toBeDisabled();
  await page.getByLabel('Schedule Transfer').check();
  await expect(date).toBeEnabled();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await date.fill(tomorrow);
  await expect(date).toHaveValue(tomorrow);
});`,
    why: ['Native date inputs accept fill() with an ISO date — no need to click a calendar.'],
  }, L),
  ch({
    id: 19, title: 'Search by Placeholder', category: 'Locators', page: '/transactions',
    description: 'Some inputs are easiest to find by placeholder.',
    objective: 'Search transactions for "Netflix" using getByPlaceholder().',
    skills: ['getByPlaceholder()', 'URL assertions'],
    expected: 'URL contains search=Netflix and the first row mentions Netflix.',
    hints: ['Placeholder: "Search by description, ID or reference".', 'Search is debounced (~350 ms).', 'Filters are reflected in the URL.'],
    solution: `${F}

test('search by placeholder', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByPlaceholder('Search by description, ID or reference').fill('Netflix');
  await expect(page).toHaveURL(/search=Netflix/);
  await expect(page.getByTestId('transaction-row').first()).toContainText('Netflix');
});`,
    why: ['Labels are preferred, but placeholders are useful when designers rely on them.'],
  }, L),
  ch({
    id: 20, title: 'Registration Validation', category: 'Forms', page: '/register',
    description: 'The server validates registrations and returns field errors.',
    objective: 'Submit the empty registration form and verify field errors.',
    skills: ['Server-side validation', 'getByText()'],
    expected: '"First name is required." and other field errors are shown.',
    hints: ['Click Register without filling anything.', 'Errors appear under each field.', 'role="alert" is used for field errors.'],
    solution: `${B}

test('registration validation', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('First name is required.')).toBeVisible();
  await expect(page.getByText('Last name is required.')).toBeVisible();
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
});`,
    why: ['The API returns all field errors at once; the UI maps them to the right fields.'],
  }, L),
  ch({
    id: 21, title: 'Register a New Customer', category: 'Forms', page: '/register',
    description: 'Create a brand-new customer with unique data.',
    objective: 'Register with a unique username, then log in with it.',
    skills: ['Dynamic test data', 'getByLabel({ exact })', 'Toasts'],
    expected: 'Success toast "Registration successful", redirect to /login, then login reaches /dashboard.',
    hints: ['Use Date.now() to build a unique username.', '"Password" also matches "Confirm Password" — use { exact: true }.', 'Check the terms checkbox.'],
    solution: `${B}

test('register new customer', async ({ page }) => {
  const username = 'pw_' + Date.now().toString(36);
  await page.goto('/register');
  await page.getByLabel('First Name').fill('Ada');
  await page.getByLabel('Last Name').fill('Lovelace');
  await page.getByLabel('Email').fill(username + '@example.com');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('Secret123');
  await page.getByLabel('Confirm Password').fill('Secret123');
  await page.getByLabel('I accept the terms and conditions').check();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByTestId('success-toast')).toContainText('Registration successful');
  await expect(page).toHaveURL(/\\/login/);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('Secret123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Ada' })).toBeVisible();
});`,
    why: ['Unique data lets the test run repeatedly and in parallel.', 'getByLabel does substring matching by default — exact: true avoids "Confirm Password".'],
  }, L),
  ch({
    id: 22, title: 'Breadcrumb', category: 'Locators', page: '/transactions',
    description: 'The header shows a breadcrumb trail.',
    objective: 'Verify the breadcrumb on the Transactions page.',
    skills: ['getByRole(navigation)', 'aria-current'],
    expected: 'Breadcrumb contains a Home link and "Transactions" marked aria-current="page".',
    hints: ['The breadcrumb nav is labelled "Breadcrumb".', 'The current item has aria-current="page".', 'locator(\'[aria-current="page"]\')'],
    solution: `${F}

test('breadcrumb', async ({ page }) => {
  await page.goto('/transactions');
  const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumb.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(crumb.locator('[aria-current="page"]')).toHaveText('Transactions');
});`,
    why: ['ARIA attributes are stable, meaningful hooks for assertions.'],
  }, L),
  ch({
    id: 23, title: 'Follow a Link', category: 'Locators', page: '/dashboard',
    description: 'Links navigate inside the single-page app.',
    objective: 'Click "View all" in Recent Transactions and verify the URL.',
    skills: ['getByRole(link)', 'toHaveURL'],
    expected: 'You land on /transactions.',
    hints: ['Link text: "View all".', 'Client-side navigation still updates the URL.', 'Assert the page heading too.'],
    solution: `${F}

test('view all link', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'View all' }).click();
  await expect(page).toHaveURL(/\\/transactions/);
  await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
});`,
    why: ['toHaveURL works for both full navigations and pushState route changes.'],
  }, L),
  ch({
    id: 24, title: 'Count Account Rows', category: 'Tables', page: '/accounts',
    description: 'John has three accounts in the canonical seed.',
    objective: 'Verify the accounts table shows 3 rows with the expected account types.',
    skills: ['toHaveCount', 'getByTestId()'],
    expected: '3 rows; one each for Checking, Savings and Credit.',
    hints: ['Rows have data-testid="account-row".', 'Use "Reset Practice Data" in the lab if you opened extra accounts.', 'filter({ hasText }) per type.'],
    solution: `${F}

test('account rows', async ({ page }) => {
  await page.goto('/accounts');
  const rows = page.getByTestId('account-row');
  await expect(rows).toHaveCount(3);
  for (const type of ['Checking', 'Savings', 'Credit']) {
    await expect(rows.filter({ hasText: type })).toHaveCount(1);
  }
});`,
    why: ['filter({ hasText }) finds rows by content instead of position.'],
  }, L),
  ch({
    id: 25, title: 'Unauthorized Page', category: 'Authentication', page: '/admin',
    description: 'Customers cannot open the admin portal.',
    objective: 'As john, open /admin and verify the Unauthorized (403) page.',
    skills: ['Role-based access', 'toHaveURL'],
    expected: 'Redirected to /unauthorized with heading "Unauthorized" and text "403".',
    hints: ['Use the logged-in fixture.', 'The page has data-testid="unauthorized-page".', 'Assert the role is mentioned.'],
    solution: `${F}

test('customer cannot open admin', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\\/unauthorized/);
  await expect(page.getByRole('heading', { name: 'Unauthorized' })).toBeVisible();
  await expect(page.getByTestId('unauthorized-page')).toContainText('403');
  await expect(page.getByTestId('unauthorized-page')).toContainText('CUSTOMER');
});`,
    why: ['Testing access control from the UI side complements API 403 checks.'],
  }, L),
];
