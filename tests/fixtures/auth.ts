import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

export const USERS = {
  john: { username: 'john', password: 'Demo@123', fullName: 'John Carter' },
  sarah: { username: 'sarah', password: 'Demo@123', fullName: 'Sarah Mitchell' },
  admin: { username: 'admin', password: 'Admin@123', fullName: 'Bank Administrator' },
} as const;

export type UserKey = keyof typeof USERS;

/** Log in through the REST API. Cookies land in the page's browser context. */
export async function loginViaApi(target: Page | APIRequestContext, user: UserKey = 'john') {
  const request = 'request' in target ? target.request : target;
  const res = await request.post('/api/auth/login', { data: { username: USERS[user].username, password: USERS[user].password } });
  expect(res.ok(), `login as ${user} failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

/** Log in through the UI, exactly like a user would. */
export async function loginViaUi(page: Page, user: UserKey = 'john') {
  await page.goto('/login');
  await page.getByLabel('Username').fill(USERS[user].username);
  await page.getByLabel('Password').fill(USERS[user].password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(user === 'admin' ? /\/admin/ : /\/dashboard/);
}

/** Random money amount with cents — avoids DUPLICATE_TRANSFER between runs. */
export const randomAmount = (min = 1, max = 90) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

/**
 * `page` is logged in as john before the test starts.
 * `adminPage` is a separate browser context logged in as admin.
 */
export const test = base.extend<{ adminPage: Page }>({
  page: async ({ page }, use) => {
    await loginViaApi(page, 'john');
    await use(page);
  },
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await loginViaApi(page, 'admin');
    await use(page);
    await context.close();
  },
});

export { expect };
