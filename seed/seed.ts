/**
 * ParaBank Pro seed data.
 *
 * - `seedDatabase(db, { random: false })` restores the canonical, deterministic dataset
 *   (same IDs, amounts and account numbers every time) — used by "Reset Practice Data".
 * - `seedDatabase(db, { random: true })` generates a brand new randomized dataset
 *   — used by "Generate New Test Data". Login credentials never change.
 */
import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export const DEMO_PASSWORD = 'Demo@123';
export const ADMIN_PASSWORD = 'Admin@123';
export const DEMO_OTP = '123456';

type Rng = () => number;
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  { user: 'john', userId: 'USR-102938', first: 'John', last: 'Carter', city: 'New York', segment: 'Premier' },
  { user: 'sarah', userId: 'USR-205611', first: 'Sarah', last: 'Mitchell', city: 'Chicago', segment: 'Retail' },
  { user: 'michael', userId: 'USR-318274', first: 'Michael', last: 'Nguyen', city: 'Seattle', segment: 'Retail' },
  { user: 'priya', userId: 'USR-427319', first: 'Priya', last: 'Sharma', city: 'San Jose', segment: 'Premier' },
  { user: 'david', userId: 'USR-536182', first: 'David', last: 'Okafor', city: 'Houston', segment: 'Retail' },
  { user: 'emma', userId: 'USR-649027', first: 'Emma', last: 'Rossi', city: 'Boston', segment: 'Private' },
  { user: 'raj', userId: 'USR-752840', first: 'Raj', last: 'Patel', city: 'Austin', segment: 'Retail' },
  { user: 'olivia', userId: 'USR-861395', first: 'Olivia', last: 'Brown', city: 'Denver', segment: 'Retail' },
  { user: 'liam', userId: 'USR-970412', first: 'Liam', last: 'Garcia', city: 'Miami', segment: 'Premier' },
  { user: 'sofia', userId: 'USR-184563', first: 'Sofia', last: 'Kim', city: 'Portland', segment: 'Retail' },
  { user: 'locked', userId: 'USR-999001', first: 'Lucas', last: 'Locke', city: 'Phoenix', segment: 'Retail', status: 'LOCKED' },
  { user: 'disabled', userId: 'USR-999002', first: 'Diana', last: 'Stone', city: 'Atlanta', segment: 'Retail', status: 'DISABLED' },
];

const MERCHANTS: Array<[string, string, number, number]> = [
  // description, type, min, max
  ['Whole Foods Market', 'Payment', 25, 220],
  ['Starbucks Coffee', 'Payment', 4, 18],
  ['Uber Ride', 'Payment', 9, 65],
  ['Netflix Subscription', 'Payment', 15.49, 15.49],
  ['Shell Gas Station', 'Payment', 30, 90],
  ['Target Store', 'Payment', 20, 260],
  ['Apple Store', 'Payment', 1.99, 1299],
  ['Delta Airlines', 'Payment', 180, 940],
  ['Walmart Supercenter', 'Payment', 15, 300],
  ['Spotify Premium', 'Payment', 11.99, 11.99],
  ['ATM Cash Withdrawal', 'Withdrawal', 40, 400],
  ['Con Edison Electricity', 'Payment', 60, 210],
  ['Verizon Wireless', 'Payment', 55, 140],
  ['Mobile Check Deposit', 'Deposit', 100, 2500],
  ['Monthly Maintenance Fee', 'Fee', 5, 15],
  ['Overdraft Protection Fee', 'Fee', 10, 35],
  ['Refund - Best Buy', 'Refund', 20, 400],
  ['Zelle Transfer', 'Transfer', 25, 800],
];

const BANKS: Array<[string, string]> = [
  ['Chase Bank', 'CHAS'],
  ['Bank of America', 'BOFA'],
  ['Wells Fargo', 'WFBI'],
  ['Citibank', 'CITI'],
  ['HDFC Bank', 'HDFC'],
  ['ICICI Bank', 'ICIC'],
  ['State Bank of India', 'SBIN'],
  ['Capital One', 'CAPO'],
];

const BENEFICIARY_NAMES = [
  'Alice Johnson', 'Robert Smith', 'Maria Gonzalez', 'Kevin Lee', 'Fatima Khan', 'Daniel Wright',
  'Ananya Iyer', 'George Miller', 'Hannah Davis', 'Omar Haddad', 'Chloe Martin', 'Vikram Singh',
  'Isabella Clark', 'Ethan Walker', 'Mei Chen', 'Noah Thompson', 'Grace Hall', 'Arjun Mehta',
  'Lily Adams', 'Samuel Young', 'Zara Ali', 'Benjamin Scott', 'Nina Petrova', 'Lucas Moreau',
];

const BILLERS = ['Electricity', 'Water', 'Internet', 'Mobile', 'Credit Card', 'Insurance'];

export function seedDatabase(db: DatabaseSync, opts: { random?: boolean; hash: (s: string) => string }) {
  const seed = opts.random ? crypto.randomInt(1, 2 ** 31 - 1) : 20260101;
  const rand = mulberry32(seed);
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const money = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100;
  const used = new Set<string>();
  const id = (prefix: string, len = 6) => {
    for (;;) {
      let s = String(int(1, 9));
      while (s.length < len) s += String(int(0, 9));
      const v = `${prefix}-${s}`;
      if (!used.has(v)) {
        used.add(v);
        return v;
      }
    }
  };
  const now = Date.now();
  const daysAgo = (d: number, h = int(8, 20), m = int(0, 59)) => {
    const dt = new Date(now - d * 86400000);
    dt.setUTCHours(h, m, int(0, 59), 0);
    return dt.toISOString();
  };

  db.exec('BEGIN');
  try {
    for (const t of [
      'documents', 'notifications', 'tickets', 'cards', 'loans', 'payments', 'beneficiaries',
      'transfers', 'transactions', 'accounts', 'users', 'customers',
    ]) {
      db.exec(`DELETE FROM ${t}`);
    }

    const insCustomer = db.prepare(
      'INSERT INTO customers (id, first_name, last_name, email, phone, city, segment, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    );
    const insUser = db.prepare(
      'INSERT INTO users (id, username, password_hash, role, customer_id, status, failed_attempts) VALUES (?,?,?,?,?,?,0)',
    );
    const insAccount = db.prepare(
      'INSERT INTO accounts (id, customer_id, type, nickname, balance, available_balance, credit_limit, status, currency, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    );
    const insTx = db.prepare(
      'INSERT INTO transactions (id, account_id, date, description, type, amount, direction, status, balance_after, reference, category) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    );
    const insBen = db.prepare(
      'INSERT INTO beneficiaries (id, customer_id, name, account_number, bank, ifsc, nickname, created_at) VALUES (?,?,?,?,?,?,?,?)',
    );
    const insPay = db.prepare(
      'INSERT INTO payments (id, customer_id, transaction_id, biller, customer_number, amount, account_id, payment_date, channel, card_last4, reference, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    const insLoan = db.prepare(
      'INSERT INTO loans (id, customer_id, loan_type, requested_amount, tenure_months, employment_type, monthly_income, existing_emi, purpose, interest_rate, status, decision_reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    const insCard = db.prepare(
      'INSERT INTO cards (id, customer_id, account_id, card_type, network, last4, holder_name, expiry, status, spending_limit, pin_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    );
    const insNtf = db.prepare(
      'INSERT INTO notifications (id, customer_id, type, title, message, is_read, created_at) VALUES (?,?,?,?,?,?,?)',
    );
    const insTicket = db.prepare(
      'INSERT INTO tickets (id, customer_id, category, subject, description, priority, attachment_name, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    );

    const demoHash = opts.hash(DEMO_PASSWORD);
    const customerIds: string[] = [];

    CUSTOMERS.forEach((c, idx) => {
      const isMain = idx === 0;
      const customerId = isMain && !opts.random ? 'CUS-100001' : id('CUS');
      customerIds.push(customerId);
      insCustomer.run(
        customerId, c.first, c.last,
        `${c.first.toLowerCase()}.${c.last.toLowerCase()}@example.com`,
        `+1-555-${String(int(100, 999))}-${String(int(1000, 9999))}`,
        c.city, c.segment, c.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE', daysAgo(int(400, 1500)),
      );
      insUser.run(c.userId, c.user, demoHash, 'CUSTOMER', customerId, c.status ?? 'ACTIVE');

      // ---------- Accounts ----------
      const accountTypes: string[] = isMain ? ['CHECKING', 'SAVINGS', 'CREDIT'] : idx < 10 ? ['CHECKING', 'SAVINGS'] : ['CHECKING'];
      if (idx === 3 || idx === 5) accountTypes.push('CREDIT');
      const fixed: Record<string, string> = { CHECKING: 'CHK-102938', SAVINGS: 'SAV-827364', CREDIT: 'CRD-554120' };
      const accounts = accountTypes.map((type) => {
        const prefix = type === 'CHECKING' ? 'CHK' : type === 'SAVINGS' ? 'SAV' : 'CRD';
        const accId = isMain && !opts.random ? fixed[type] : id(prefix);
        used.add(accId);
        return { id: accId, type };
      });

      for (const acc of accounts) {
        const txCount = isMain ? (acc.type === 'CHECKING' ? 72 : acc.type === 'SAVINGS' ? 30 : 26) : int(6, 10);
        const isCredit = acc.type === 'CREDIT';
        const creditLimit = isCredit ? pick([5000, 7500, 10000, 15000]) : null;
        let balance = isCredit ? money(200, 800) : acc.type === 'SAVINGS' ? money(8000, 25000) : money(2500, 6000);
        const events: Array<{ date: string; description: string; type: string; amount: number; status: string; category: string }> = [];

        // Salary each ~month on checking
        if (acc.type === 'CHECKING') {
          for (let m = 0; m < Math.ceil(txCount / 14); m++) {
            events.push({ date: daysAgo(m * 30 + 3, 9, 0), description: 'Salary - Acme Corporation', type: 'Salary', amount: isMain ? 6850 : money(3200, 7400), status: 'Completed', category: 'Income' });
          }
        }
        if (acc.type === 'SAVINGS') {
          for (let m = 0; m < 6; m++) {
            events.push({ date: daysAgo(m * 30 + 1, 0, 5), description: 'Monthly Interest Credit', type: 'Interest', amount: money(12, 48), status: 'Completed', category: 'Income' });
          }
        }
        while (events.length < txCount) {
          let [description, type, min, max] = pick(MERCHANTS);
          if (acc.type === 'SAVINGS') {
            [description, type, min, max] = pick([
              ['Transfer from Checking', 'Transfer', 200, 1500],
              ['Transfer to Checking', 'Transfer', 100, 900],
              ['Branch Cash Deposit', 'Deposit', 100, 1200],
              ['ATM Cash Withdrawal', 'Withdrawal', 60, 300],
            ] as Array<[string, string, number, number]>);
          }
          if (isCredit && (type === 'Withdrawal' || type === 'Deposit' || type === 'Transfer')) continue;
          const r = rand();
          const status = r < 0.82 ? 'Completed' : r < 0.91 ? 'Pending' : r < 0.97 ? 'Failed' : 'Reversed';
          events.push({ date: daysAgo(int(0, 179)), description, type, amount: money(min, max), status, category: type === 'Payment' ? 'Shopping' : type });
        }
        if (isMain && acc.type === 'CHECKING') {
          // Anchor rows used by the locator challenges.
          events[events.length - 1] = { date: daysAgo(4, 14, 22), description: 'Amazon Marketplace Order #114-882', type: 'Payment', amount: 249.99, status: 'Completed', category: 'Shopping' };
          events[events.length - 2] = { date: daysAgo(6, 11, 5), description: 'Netflix Subscription', type: 'Payment', amount: 15.49, status: 'Pending', category: 'Entertainment' };
          events[events.length - 3] = { date: daysAgo(9, 16, 40), description: 'Wire Transfer - Rent October', type: 'Transfer', amount: 1850, status: 'Failed', category: 'Housing' };
        }
        events.sort((a, b) => a.date.localeCompare(b.date));

        // Walk forward in time computing running balance.
        let running = balance;
        const rows = events.map((e) => {
          const credit = isCredit
            ? e.type === 'Refund'
            : ['Deposit', 'Salary', 'Interest', 'Refund'].includes(e.type) || e.description.startsWith('Transfer from');
          const direction = credit ? 'CREDIT' : 'DEBIT';
          if (e.status === 'Completed' || e.status === 'Pending') {
            if (isCredit) running += credit ? -e.amount : e.amount;
            else running += credit ? e.amount : -e.amount;
            if (!isCredit && running < 50) running += 3000; // keep accounts realistic
            if (isCredit && running < 0) running = 0;
          }
          return { ...e, direction, balanceAfter: Math.round(running * 100) / 100 };
        });
        balance = Math.round(running * 100) / 100;
        if (isCredit && creditLimit && balance > creditLimit * 0.8) balance = Math.round(creditLimit * 0.45 * 100) / 100;
        const available = isCredit ? Math.round(((creditLimit ?? 0) - balance) * 100) / 100 : balance;
        insAccount.run(
          acc.id, customerId, acc.type,
          acc.type === 'CHECKING' ? 'Everyday Checking' : acc.type === 'SAVINGS' ? 'High-Yield Savings' : 'Platinum Rewards Credit',
          balance, available, creditLimit, 'ACTIVE', 'USD',
          daysAgo(acc.type === 'CHECKING' ? 1100 + idx : acc.type === 'SAVINGS' ? 900 + idx : 500 + idx, 10, 0),
        );
        for (const r of rows) {
          insTx.run(id('TXN'), acc.id, r.date, r.description, r.type, r.amount, r.direction, r.status, r.balanceAfter, `REF${int(100000, 999999)}`, r.category);
        }
      }

      // ---------- Cards ----------
      const holder = `${c.first} ${c.last}`.toUpperCase();
      const chk = accounts.find((a) => a.type === 'CHECKING')!;
      insCard.run(id('CRD'), customerId, chk.id, 'DEBIT', 'VISA', String(int(1000, 9999)), holder, `${String(int(1, 12)).padStart(2, '0')}/${int(27, 31)}`, 'ACTIVE', 2500, null, daysAgo(int(100, 700)));
      const credit = accounts.find((a) => a.type === 'CREDIT');
      if (credit) {
        insCard.run(id('CRD'), customerId, credit.id, 'CREDIT', 'MASTERCARD', isMain && !opts.random ? '8273' : String(int(1000, 9999)), holder, `${String(int(1, 12)).padStart(2, '0')}/${int(27, 31)}`, isMain ? 'ACTIVE' : pick(['ACTIVE', 'FROZEN']), 5000, null, daysAgo(int(100, 700)));
      }

      // ---------- Beneficiaries ----------
      const benCount = isMain ? 8 : idx < 10 ? 2 : 0;
      const names = [...BENEFICIARY_NAMES].sort(() => rand() - 0.5);
      for (let b = 0; b < benCount; b++) {
        const [bank, code] = pick(BANKS);
        const name = isMain && !opts.random && b === 0 ? 'Alice Johnson' : names[b];
        insBen.run(
          id('BEN'), customerId, name, String(int(10000000, 99999999)) + String(int(1000, 9999)), bank,
          `${code}0${String(int(100000, 999999))}`, name.split(' ')[0], daysAgo(int(10, 400)),
        );
      }

      // ---------- Payments ----------
      const payCount = isMain ? 7 : idx < 10 ? 1 : 0;
      for (let p = 0; p < payCount; p++) {
        const biller = BILLERS[p % BILLERS.length];
        const status = p === 5 ? 'FAILED' : p === 6 ? 'SCHEDULED' : 'SUCCESS';
        const d = p === 6 ? new Date(now + 5 * 86400000).toISOString() : daysAgo(int(1, 90));
        insPay.run(id('PAY'), customerId, null, biller, `${biller.slice(0, 3).toUpperCase()}${int(100000, 999999)}`, money(25, 400), chk.id, d, 'WEB', null, null, status, d);
      }

      // ---------- Loans ----------
      const loanPlan = isMain
        ? [['Home Loan', 'UNDER_REVIEW'], ['Car Loan', 'APPROVED'], ['Personal Loan', 'REJECTED']]
        : idx < 8 ? [[pick(['Personal Loan', 'Car Loan', 'Education Loan', 'Home Loan']), pick(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'])]] : [];
      for (const [type, status] of loanPlan) {
        const created = daysAgo(int(5, 120));
        const amount = type === 'Home Loan' ? money(150000, 450000) : type === 'Car Loan' ? money(15000, 45000) : money(3000, 25000);
        insLoan.run(
          id('LOAN'), customerId, type, Math.round(amount), pick([12, 24, 36, 60, 120, 240]), pick(['Salaried', 'Self-Employed']),
          money(4000, 12000), money(0, 900), `${type} for personal needs`, type === 'Home Loan' ? 6.75 : type === 'Car Loan' ? 7.9 : 10.5,
          status, status === 'REJECTED' ? 'Debt-to-income ratio exceeds 50%' : null, created, created,
        );
      }

      // ---------- Notifications ----------
      const notifications: Array<[string, string, string]> = isMain
        ? [
            ['Transaction', 'Salary credited', 'Your salary of $6,850.00 has been credited to CHK account.'],
            ['Security', 'New login detected', 'A new login to your account was detected from Chrome on Windows.'],
            ['Payment', 'Bill payment successful', 'Your Electricity bill payment was processed successfully.'],
            ['Loan', 'Loan application update', 'Your Home Loan application is now under review.'],
            ['Promotion', 'Earn 5% cashback', 'Use your Platinum Rewards card on groceries this month.'],
            ['Transaction', 'Large debit alert', 'A debit above $500 was made from your checking account.'],
            ['Security', 'Password expiring soon', 'Your password will expire in 14 days.'],
            ['Payment', 'Upcoming scheduled payment', 'An Insurance payment is scheduled in 5 days.'],
            ['Loan', 'Car loan approved', 'Congratulations! Your Car Loan has been approved.'],
            ['Promotion', 'Refer a friend', 'Get $50 for every friend who opens an account.'],
            ['Transaction', 'Payment failed', 'A wire transfer for rent failed. Please retry.'],
            ['Security', 'Card frozen alert', 'If you did not freeze your card, contact support.'],
          ]
        : [
            ['Transaction', 'Deposit received', 'A deposit was credited to your account.'],
            ['Promotion', 'Savings booster', 'Boost your savings rate to 4.25% APY.'],
          ];
      if (idx < 10) {
        notifications.forEach(([type, title, message], n) => {
          insNtf.run(id('NTF'), customerId, type, title, message, n % 3 === 0 ? 1 : 0, daysAgo(n * 2 + int(0, 1)));
        });
      }

      // ---------- Support tickets ----------
      const ticketPlan = isMain
        ? [
            ['Card Services', 'Card declined at merchant', 'My debit card was declined at a grocery store.', 'High', 'OPEN'],
            ['Account', 'Update mailing address', 'Please update my address to the new apartment.', 'Low', 'RESOLVED'],
            ['Transactions', 'Dispute Netflix charge', 'I was charged twice for Netflix.', 'Medium', 'IN_PROGRESS'],
          ]
        : idx < 9 ? [[pick(['Account', 'Loans', 'Online Banking']), pick(['Unable to reset password', 'Loan document query', 'Statement not received']), 'Customer requested assistance.', pick(['Low', 'Medium', 'High']), pick(['OPEN', 'IN_PROGRESS', 'CLOSED'])]] : [];
      for (const [category, subject, description, priority, status] of ticketPlan) {
        const created = daysAgo(int(1, 60));
        insTicket.run(id('TKT'), customerId, category, subject, description, priority, null, status, created, created);
      }
    });

    // ---------- Admin ----------
    insUser.run('USR-000001', 'admin', opts.hash(ADMIN_PASSWORD), 'ADMIN', null, 'ACTIVE');

    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('seed', JSON.stringify({ seed, random: !!opts.random, at: new Date().toISOString() }));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { seed, random: !!opts.random };
}
