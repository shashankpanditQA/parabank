// Challenge #61 (advanced) — Multiple Windows
// Objective: Identify each window by URL and title.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

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
});
