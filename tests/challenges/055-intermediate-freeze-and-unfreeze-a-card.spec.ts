// Challenge #55 (intermediate) — Freeze and Unfreeze a Card
// Objective: Freeze the debit card, verify FROZEN, then unfreeze and verify ACTIVE.
// Generated from challenges/intermediate/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '../fixtures/auth'; // `page` is already logged in as john

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
});
