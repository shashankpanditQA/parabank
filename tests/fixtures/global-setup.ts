import { request, type FullConfig } from '@playwright/test';

/** Restore the canonical seed before the suite runs so assertions on seed data are stable. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  if (process.env.SKIP_RESET === 'true') return;
  const api = await request.newContext({ baseURL });
  const login = await api.post('/api/auth/login', { data: { username: 'admin', password: 'Admin@123' } });
  if (!login.ok()) throw new Error(`Global setup: admin login failed (${login.status()}) at ${baseURL}`);
  const reset = await api.post('/api/lab/reset');
  if (!reset.ok()) throw new Error(`Global setup: reset failed (${reset.status()})`);
  // Make sure nobody left the shared demo users disabled.
  const customers = await (await api.get('/api/admin/customers?pageSize=100')).json();
  for (const c of customers.data) {
    if (c.status === 'DISABLED' && c.username !== 'disabled') {
      await api.patch(`/api/admin/customers/${c.customerId}/status`, { data: { status: 'ACTIVE' } });
    }
  }
  await api.dispose();
}
