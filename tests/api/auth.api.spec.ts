import { test, expect } from '@playwright/test';

test.describe('Auth API', () => {
  test('login returns a dynamic session', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, userId: 'USR-102938', role: 'CUSTOMER', message: 'Login successful' });
    expect(body.sessionId).toMatch(/^SES-\d{6}-[0-9a-f]{16}$/);
    expect(res.headers()['set-cookie']).toContain('pb_session=');
  });

  const negative = [
    { name: 'empty username', data: { username: '', password: 'x' }, status: 400, code: 'USERNAME_REQUIRED' },
    { name: 'empty password', data: { username: 'john', password: '' }, status: 400, code: 'PASSWORD_REQUIRED' },
    { name: 'unknown user', data: { username: 'ghost', password: 'Demo@123' }, status: 401, code: 'INVALID_USERNAME' },
    { name: 'wrong password', data: { username: 'john', password: 'nope' }, status: 401, code: 'INVALID_PASSWORD' },
    { name: 'locked user', data: { username: 'locked', password: 'Demo@123' }, status: 423, code: 'ACCOUNT_LOCKED' },
    { name: 'disabled user', data: { username: 'disabled', password: 'Demo@123' }, status: 403, code: 'ACCOUNT_DISABLED' },
  ];
  for (const c of negative) {
    test(`login rejects ${c.name}`, async ({ request }) => {
      const res = await request.post('/api/auth/login', { data: c.data });
      expect(res.status()).toBe(c.status);
      expect(await res.json()).toMatchObject({ success: false, errorCode: c.code });
    });
  }

  test('bearer token, invalid token and expired session', async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL });
    const { sessionId } = await (await api.post('/api/auth/login', { data: { username: 'sarah', password: 'Demo@123', issueCookie: false } })).json();
    const auth = { Authorization: `Bearer ${sessionId}` };
    expect((await api.get('/api/auth/me', { headers: auth })).status()).toBe(200);

    const invalid = await api.get('/api/accounts', { headers: { Authorization: 'Bearer SES-000000-deadbeefdeadbeef' } });
    expect(invalid.status()).toBe(401);
    expect((await invalid.json()).errorCode).toBe('INVALID_TOKEN');

    await api.post('/api/auth/expire-session', { headers: auth });
    const expired = await api.get('/api/accounts', { headers: auth });
    expect(expired.status()).toBe(401);
    expect((await expired.json()).errorCode).toBe('SESSION_EXPIRED');
    await api.dispose();
  });

  test('customers get 403 on admin endpoints', async ({ request }) => {
    await request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
    const res = await request.get('/api/admin/customers');
    expect(res.status()).toBe(403);
    expect((await res.json()).errorCode).toBe('FORBIDDEN');
  });
});
