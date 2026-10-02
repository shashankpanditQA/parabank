// Challenge #72 (advanced) — API Testing with APIRequestContext
// Objective: Log in via POST /api/auth/login, then call GET /api/accounts with a Bearer token.
// Generated from challenges/advanced/index.ts — edit the source, then run `npm run challenges:generate`.

import { test, expect } from '@playwright/test';

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
});
