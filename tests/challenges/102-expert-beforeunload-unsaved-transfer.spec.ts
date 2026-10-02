// Challenge #102 (expert) — beforeunload: Unsaved Transfer
// Objective: Handle both: stay on the page when dismissing, leave when accepting.
// Generated from challenges/expert/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

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
  await expect(page).toHaveURL(/\/transfers/);

  // 2) Closing the tab → beforeunload, dismissed = stay on the page
  const dialogPromise = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  expect(page.isClosed()).toBe(false);
  await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('250');
});
