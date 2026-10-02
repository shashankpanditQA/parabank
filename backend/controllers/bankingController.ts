import type { Request, Response } from 'express';
import { all, get, run, tx } from '../database/db.js';
import { customerId } from '../middleware/auth.js';
import { badRequest, notFound, paginate, sortRows, str, num, validate, unprocessable } from '../utils/http.js';
import { newAccountNumber, nowIso, round2 } from '../utils/ids.js';
import { toAccount, toCustomer, toNotification, toPayment, toTransaction, toTransfer } from '../models/mappers.js';
import { BILLERS, createPayment, createTransfer, notify, ownedAccount, postEntry } from '../services/banking.js';

// ---------------------------------------------------------------- Dashboard
export function dashboard(req: Request, res: Response) {
  const cid = customerId(req);
  const customer = get('SELECT * FROM customers WHERE id = ?', cid)!;
  const accounts = all('SELECT * FROM accounts WHERE customer_id = ? ORDER BY type', cid);
  const sum = (type: string) => round2(accounts.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0));
  const checking = sum('CHECKING');
  const savings = sum('SAVINGS');
  const credit = sum('CREDIT');
  const recent = all(
    `SELECT t.*, a.type AS account_type FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.customer_id = ? ORDER BY t.date DESC LIMIT 6`,
    cid,
  );
  const pendingPayments = all(`SELECT * FROM payments WHERE customer_id = ? AND status IN ('SCHEDULED','PENDING') ORDER BY payment_date`, cid);
  const scheduledTransfers = all(`SELECT * FROM transfers WHERE customer_id = ? AND status = 'SCHEDULED' ORDER BY scheduled_date`, cid);
  const notifications = all('SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5', cid);
  const unread = get<{ c: number }>('SELECT COUNT(*) c FROM notifications WHERE customer_id = ? AND is_read = 0', cid)!.c;
  res.json({
    success: true,
    customer: toCustomer(customer),
    balances: {
      total: round2(checking + savings - credit),
      checking,
      savings,
      credit,
      currency: 'USD',
    },
    accounts: accounts.map(toAccount),
    recentTransactions: recent.map(toTransaction),
    pendingPayments: pendingPayments.map(toPayment),
    scheduledTransfers: scheduledTransfers.map(toTransfer),
    notifications: notifications.map(toNotification),
    unreadNotifications: unread,
  });
}

// ---------------------------------------------------------------- Accounts
export function listAccounts(req: Request, res: Response) {
  const cid = customerId(req);
  const rows = all('SELECT * FROM accounts WHERE customer_id = ? ORDER BY created_at', cid);
  res.json({ success: true, count: rows.length, data: rows.map(toAccount) });
}

export function getAccount(req: Request, res: Response) {
  const cid = customerId(req);
  const acc = get('SELECT * FROM accounts WHERE id = ? AND customer_id = ?', req.params.id, cid);
  if (!acc) throw notFound('ACCOUNT_NOT_FOUND', `Account ${req.params.id} was not found.`);
  const recent = all(`SELECT t.*, ? AS account_type FROM transactions t WHERE account_id = ? ORDER BY date DESC LIMIT 10`, acc.type, acc.id);
  const stats = get(
    `SELECT COUNT(*) AS count, COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount END),0) AS credits, COALESCE(SUM(CASE WHEN direction='DEBIT' THEN amount END),0) AS debits FROM transactions WHERE account_id = ? AND status = 'Completed'`,
    acc.id,
  );
  res.json({ success: true, data: { ...toAccount(acc), transactionCount: stats?.count, totalCredits: round2(stats?.credits ?? 0), totalDebits: round2(stats?.debits ?? 0), recentTransactions: recent.map(toTransaction) } });
}

export function openAccount(req: Request, res: Response) {
  const cid = customerId(req);
  const type = str(req.body?.accountType).toUpperCase();
  const initialDeposit = req.body?.initialDeposit === undefined || req.body?.initialDeposit === '' ? 0 : num(req.body.initialDeposit);
  validate([
    [!['CHECKING', 'SAVINGS', 'CREDIT'].includes(type), 'accountType', 'Account type must be CHECKING, SAVINGS or CREDIT.'],
    [Number.isNaN(initialDeposit) || initialDeposit < 0, 'initialDeposit', 'Initial deposit must be zero or a positive amount.'],
    [type === 'CREDIT' && initialDeposit > 0, 'initialDeposit', 'Credit accounts cannot be funded with an initial deposit.'],
    [initialDeposit > 0 && !str(req.body?.fundingAccount), 'fundingAccount', 'Select a funding account for the initial deposit.'],
  ]);
  const count = get<{ c: number }>('SELECT COUNT(*) c FROM accounts WHERE customer_id = ?', cid)!.c;
  if (count >= 8) throw unprocessable('ACCOUNT_LIMIT_REACHED', 'You can hold at most 8 accounts.');
  const result = tx(() => {
    const id = newAccountNumber(type);
    const creditLimit = type === 'CREDIT' ? 5000 : null;
    run('INSERT INTO accounts (id, customer_id, type, nickname, balance, available_balance, credit_limit, status, currency, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, cid, type, str(req.body?.nickname) || (type === 'CHECKING' ? 'Checking' : type === 'SAVINGS' ? 'Savings' : 'Credit Card'), 0, creditLimit ?? 0, creditLimit, 'ACTIVE', str(req.body?.currency) || 'USD', nowIso());
    if (initialDeposit > 0) {
      const funding = ownedAccount(cid, str(req.body.fundingAccount));
      if (funding.type === 'CREDIT' || funding.available_balance < initialDeposit) {
        throw unprocessable('INSUFFICIENT_BALANCE', 'Insufficient account balance', { availableBalance: funding.available_balance });
      }
      postEntry({ accountId: funding.id, amount: initialDeposit, direction: 'DEBIT', type: 'Transfer', description: `Initial deposit to ${id}` });
      postEntry({ accountId: id, amount: initialDeposit, direction: 'CREDIT', type: 'Deposit', description: `Initial deposit from ${funding.id}` });
    }
    notify(cid, 'Transaction', 'New account opened', `Your new ${type.toLowerCase()} account ${id} is ready to use.`);
    return get('SELECT * FROM accounts WHERE id = ?', id)!;
  });
  res.status(201).json({ success: true, accountNumber: result.id, accountType: result.type, status: result.status, currentBalance: result.balance, availableBalance: result.available_balance, currency: result.currency, createdDate: result.created_at, message: 'Account opened successfully' });
}

/** Quick actions: deposit & withdraw (cash simulation). */
export function cashOperation(kind: 'Deposit' | 'Withdrawal') {
  return (req: Request, res: Response) => {
    const cid = customerId(req);
    const amount = num(req.body?.amount);
    validate([
      [!str(req.body?.accountId), 'accountId', 'Please select an account.'],
      [Number.isNaN(amount) || amount <= 0, 'amount', 'Amount must be greater than zero.'],
      [amount > 10000, 'amount', `${kind === 'Deposit' ? 'Deposits' : 'Withdrawals'} are limited to $10,000 per transaction.`],
    ]);
    const acc = ownedAccount(cid, str(req.body.accountId));
    if (acc.type === 'CREDIT') throw badRequest('INVALID_ACCOUNT', `${kind}s are not supported on credit accounts.`);
    if (kind === 'Withdrawal' && amount > acc.available_balance) {
      throw unprocessable('INSUFFICIENT_BALANCE', 'Insufficient account balance', { availableBalance: acc.available_balance, requestedAmount: amount });
    }
    const entry = tx(() =>
      postEntry({ accountId: acc.id, amount, direction: kind === 'Deposit' ? 'CREDIT' : 'DEBIT', type: kind, description: str(req.body?.description) || (kind === 'Deposit' ? 'Online Cash Deposit' : 'Online Cash Withdrawal') }),
    );
    res.status(201).json({ success: true, transactionId: entry.transactionId, accountId: acc.id, type: kind, amount: round2(amount), balanceAfter: entry.balanceAfter, status: 'COMPLETED', message: `${kind} completed successfully` });
  };
}

// ---------------------------------------------------------------- Transactions
const TX_SORT = ['date', 'amount', 'description', 'type', 'status', 'transactionId', 'balanceAfter', 'accountId'];

export function queryTransactions(filter: { customerId?: string }, q: Request['query']) {
  const where: string[] = [];
  const params: any[] = [];
  if (filter.customerId) {
    where.push('a.customer_id = ?');
    params.push(filter.customerId);
  }
  const search = str(q.search ?? q.q);
  if (search) {
    where.push('(t.description LIKE ? OR t.id LIKE ? OR t.reference LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (str(q.status)) {
    where.push('lower(t.status) = lower(?)');
    params.push(str(q.status));
  }
  if (str(q.type)) {
    where.push('lower(t.type) = lower(?)');
    params.push(str(q.type));
  }
  if (str(q.accountId)) {
    where.push('t.account_id = ?');
    params.push(str(q.accountId));
  }
  if (str(q.fromDate)) {
    where.push('t.date >= ?');
    params.push(str(q.fromDate));
  }
  if (str(q.toDate)) {
    where.push('t.date <= ?');
    params.push(`${str(q.toDate)}T23:59:59.999Z`);
  }
  if (str(q.minAmount)) {
    where.push('t.amount >= ?');
    params.push(num(q.minAmount));
  }
  if (str(q.maxAmount)) {
    where.push('t.amount <= ?');
    params.push(num(q.maxAmount));
  }
  const rows = all(
    `SELECT t.*, a.type AS account_type, a.customer_id FROM transactions t JOIN accounts a ON a.id = t.account_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.date DESC`,
    ...params,
  ).map(toTransaction);
  const sortBy = str(q.sortBy) || 'date';
  const order = str(q.order) || (sortBy === 'date' ? 'desc' : 'asc');
  return sortRows(rows, sortBy, order, TX_SORT);
}

export function listTransactions(req: Request, res: Response) {
  const rows = queryTransactions({ customerId: customerId(req) }, req.query);
  const page = paginate(rows, req.query.page, req.query.pageSize, 10);
  res.json({
    ...page,
    summary: {
      totalCredits: round2(rows.filter((r) => r.direction === 'CREDIT').reduce((s, r) => s + r.amount, 0)),
      totalDebits: round2(rows.filter((r) => r.direction === 'DEBIT').reduce((s, r) => s + r.amount, 0)),
    },
  });
}

export function getTransaction(req: Request, res: Response) {
  const cid = customerId(req);
  const row = get(
    'SELECT t.*, a.type AS account_type FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ? AND a.customer_id = ?',
    req.params.id,
    cid,
  );
  if (!row) throw notFound('TRANSACTION_NOT_FOUND', `Transaction ${req.params.id} was not found.`);
  res.json({ success: true, data: toTransaction(row) });
}

// ---------------------------------------------------------------- Transfers
export function postTransfer(req: Request, res: Response) {
  const result = createTransfer(customerId(req), req.body ?? {});
  res.status(201).json(result);
}

export function listTransfers(req: Request, res: Response) {
  const rows = all('SELECT * FROM transfers WHERE customer_id = ? ORDER BY created_at DESC', customerId(req)).map(toTransfer);
  res.json({ success: true, count: rows.length, data: rows });
}

// ---------------------------------------------------------------- Payments
export async function postPayment(req: Request, res: Response) {
  const result = await createPayment(customerId(req), req.body ?? {});
  res.status(201).json(result);
}

export function listPayments(req: Request, res: Response) {
  const rows = all('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC', customerId(req)).map(toPayment);
  const status = str(req.query.status);
  const filtered = status ? rows.filter((r) => r.status === status.toUpperCase()) : rows;
  res.json({ success: true, count: filtered.length, data: filtered });
}

export function listBillers(_req: Request, res: Response) {
  res.json({ success: true, data: BILLERS });
}
