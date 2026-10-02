import { test, expect } from '@playwright/test';
import { randomAmount } from '../fixtures/auth';

test.describe('Banking API', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
  });

  test('accounts list and detail', async ({ request }) => {
    const list = await (await request.get('/api/accounts')).json();
    expect(list.count).toBeGreaterThanOrEqual(3);
    const chk = list.data.find((a: any) => a.accountType === 'CHECKING');
    const detail = await request.get(`/api/accounts/${chk.accountNumber}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).data.recentTransactions.length).toBeGreaterThan(0);
    expect((await request.get('/api/accounts/CHK-000000')).status()).toBe(404);
  });

  test('transactions support search, filters, sorting and pagination', async ({ request }) => {
    const page1 = await (await request.get('/api/transactions?pageSize=10')).json();
    expect(page1.pagination.total).toBeGreaterThanOrEqual(100);
    expect(page1.data).toHaveLength(10);
    const amazon = await (await request.get('/api/transactions?search=amazon')).json();
    expect(amazon.data[0]).toMatchObject({ description: expect.stringContaining('Amazon'), amount: 249.99, status: 'Completed' });
    const sorted = await (await request.get('/api/transactions?sortBy=amount&order=asc&pageSize=20')).json();
    const amounts = sorted.data.map((t: any) => t.amount);
    expect(amounts).toEqual([...amounts].sort((a: number, b: number) => a - b));
    const failed = await (await request.get('/api/transactions?status=Failed&pageSize=50')).json();
    expect(failed.data.every((t: any) => t.status === 'Failed')).toBe(true);
  });

  test('transfer debits and credits both accounts', async ({ request }) => {
    const amount = randomAmount();
    const bal = async (id: string) => (await (await request.get(`/api/accounts/${id}`)).json()).data.currentBalance;
    const [chk0, sav0] = [await bal('CHK-102938'), await bal('SAV-827364')];
    const res = await request.post('/api/transfers', { data: { fromAccount: 'CHK-102938', toAccount: 'SAV-827364', amount, otp: '123456', description: 'API test' } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, status: 'COMPLETED', fromAccount: 'CHK-102938', toAccount: 'SAV-827364', amount });
    expect(body.transactionId).toMatch(/^TXN-\d{6}$/);
    expect(await bal('CHK-102938')).toBe(Math.round((chk0 - amount) * 100) / 100);
    expect(await bal('SAV-827364')).toBe(Math.round((sav0 + amount) * 100) / 100);

    const dup = await request.post('/api/transfers', { data: { fromAccount: 'CHK-102938', toAccount: 'SAV-827364', amount, otp: '123456' } });
    expect(dup.status()).toBe(409);
    expect((await dup.json()).errorCode).toBe('DUPLICATE_TRANSFER');
  });

  test('bill payment, loan and support ticket return dynamic IDs', async ({ request }) => {
    const pay = await request.post('/api/payments', { data: { biller: 'Water', customerNumber: 'WAT778899', amount: randomAmount(), accountId: 'CHK-102938' } });
    expect(pay.status()).toBe(201);
    expect((await pay.json()).paymentId).toMatch(/^PAY-\d{6}$/);

    const loan = await request.post('/api/loans', { data: { loanType: 'Home Loan', requestedAmount: 250000, tenure: 240, employmentType: 'Salaried', monthlyIncome: 9000, existingEmi: 0, purpose: 'Buying a home' } });
    expect(await loan.json()).toMatchObject({ success: true, status: 'UNDER_REVIEW', requestedAmount: 250000, applicationId: expect.stringMatching(/^LOAN-\d{6}$/) });

    const rejected = await request.post('/api/loans', { data: { loanType: 'Personal Loan', requestedAmount: 50000, tenure: 12, employmentType: 'Salaried', monthlyIncome: 2000, existingEmi: 500, purpose: 'Too much debt' } });
    expect((await rejected.json()).status).toBe('REJECTED');

    const ticket = await request.post('/api/support/tickets', { data: { category: 'Account', subject: 'API ticket', description: 'Created by the Playwright API suite.', priority: 'Low' } });
    expect(await ticket.json()).toMatchObject({ success: true, status: 'OPEN', ticketId: expect.stringMatching(/^TKT-\d{6}$/) });
  });

  test('beneficiary CRUD', async ({ request }) => {
    const accountNumber = String(Date.now()).slice(-12);
    const created = await request.post('/api/beneficiaries', { data: { name: 'API Person', accountNumber, bank: 'Chase Bank', ifsc: 'chas0123456' } });
    expect(created.status()).toBe(201);
    const { id, ifsc } = await created.json();
    expect(ifsc).toBe('CHAS0123456');
    expect((await request.post('/api/beneficiaries', { data: { name: 'Dup', accountNumber, bank: 'Chase Bank', ifsc: 'CHAS0123456' } })).status()).toBe(409);
    const updated = await request.put(`/api/beneficiaries/${id}`, { data: { nickname: 'Apy' } });
    expect((await updated.json()).nickname).toBe('Apy');
    expect((await request.delete(`/api/beneficiaries/${id}`)).status()).toBe(200);
    expect((await request.get(`/api/beneficiaries/${id}`)).status()).toBe(404);
  });

  test('failure injection headers', async ({ request }) => {
    for (const [mode, status] of [['500', 500], ['403', 403], ['404', 404], ['429', 429]] as const) {
      const res = await request.get('/api/accounts', { headers: { 'x-simulate-failure': mode } });
      expect(res.status()).toBe(status);
      expect((await res.json()).simulated).toBe(true);
    }
    const invalid = await request.get('/api/accounts', { headers: { 'x-simulate-failure': 'invalid-json' } });
    await expect(invalid.json()).rejects.toThrow();
    const started = Date.now();
    await request.get('/api/accounts', { headers: { 'x-simulate-delay': '1000' } });
    expect(Date.now() - started).toBeGreaterThanOrEqual(950);
  });

  test('file download headers', async ({ request }) => {
    const res = await request.get('/api/downloads/statement?accountId=CHK-102938');
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect(res.headers()['content-disposition']).toMatch(/attachment; filename="statement-CHK-102938-\d{4}-\d{2}\.pdf"/);
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
