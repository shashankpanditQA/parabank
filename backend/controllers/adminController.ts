import type { Request, Response } from 'express';
import { all, get, run } from '../database/db.js';
import { badRequest, notFound, paginate, sortRows, str, validate } from '../utils/http.js';
import { nowIso, round2 } from '../utils/ids.js';
import { toCustomer, toLoan, toTicket } from '../models/mappers.js';
import { notify } from '../services/banking.js';
import { queryTransactions } from './bankingController.js';

export function adminStats(_req: Request, res: Response) {
  const count = (sql: string) => get<{ c: number }>(sql)!.c;
  res.json({
    success: true,
    data: {
      customers: count('SELECT COUNT(*) c FROM customers'),
      activeCustomers: count(`SELECT COUNT(*) c FROM customers WHERE status = 'ACTIVE'`),
      accounts: count('SELECT COUNT(*) c FROM accounts'),
      transactions: count('SELECT COUNT(*) c FROM transactions'),
      pendingLoans: count(`SELECT COUNT(*) c FROM loans WHERE status IN ('SUBMITTED','UNDER_REVIEW')`),
      openTickets: count(`SELECT COUNT(*) c FROM tickets WHERE status IN ('OPEN','IN_PROGRESS')`),
      totalDeposits: round2(get<{ s: number }>(`SELECT COALESCE(SUM(balance),0) s FROM accounts WHERE type != 'CREDIT'`)!.s),
    },
  });
}

export function adminCustomers(req: Request, res: Response) {
  const rows = all(`
    SELECT c.*, u.username, u.id AS user_id, u.status AS user_status, u.last_login,
      (SELECT COUNT(*) FROM accounts a WHERE a.customer_id = c.id) AS account_count,
      (SELECT COALESCE(SUM(balance),0) FROM accounts a WHERE a.customer_id = c.id AND a.type != 'CREDIT') AS total_balance
    FROM customers c LEFT JOIN users u ON u.customer_id = c.id`).map((r) => ({
    ...toCustomer(r),
    userId: r.user_id,
    username: r.username,
    loginStatus: r.user_status,
    lastLogin: r.last_login,
    accountCount: r.account_count,
    totalBalance: round2(r.total_balance),
  }));
  const search = str(req.query.search).toLowerCase();
  const status = str(req.query.status).toUpperCase();
  const segment = str(req.query.segment);
  let filtered = rows.filter((r) =>
    (!search || [r.fullName, r.email, r.customerId, r.username, r.city].some((v) => String(v ?? '').toLowerCase().includes(search))) &&
    (!status || r.status === status) &&
    (!segment || r.segment === segment),
  );
  filtered = sortRows(filtered, str(req.query.sortBy) || 'fullName', str(req.query.order) || 'asc', ['fullName', 'customerId', 'city', 'status', 'totalBalance', 'accountCount', 'createdAt', 'segment']);
  res.json(paginate(filtered, req.query.page, req.query.pageSize, 5));
}

export function adminSetCustomerStatus(req: Request, res: Response) {
  const status = str(req.body?.status).toUpperCase();
  validate([[!['ACTIVE', 'DISABLED'].includes(status), 'status', 'Status must be ACTIVE or DISABLED.']]);
  const c = get('SELECT * FROM customers WHERE id = ?', req.params.id);
  if (!c) throw notFound('CUSTOMER_NOT_FOUND', `Customer ${req.params.id} was not found.`);
  run('UPDATE customers SET status = ? WHERE id = ?', status, c.id);
  const user = get('SELECT * FROM users WHERE customer_id = ?', c.id);
  if (user && user.status !== 'LOCKED') run('UPDATE users SET status = ? WHERE id = ?', status, user.id);
  if (status === 'DISABLED' && user) run('DELETE FROM sessions WHERE user_id = ?', user.id);
  res.json({ success: true, customerId: c.id, status, message: `Customer ${c.first_name} ${c.last_name} ${status === 'ACTIVE' ? 'enabled' : 'disabled'} successfully` });
}

export function adminTransactions(req: Request, res: Response) {
  const rows = queryTransactions({}, req.query);
  res.json(paginate(rows, req.query.page, req.query.pageSize, 10));
}

export function adminLoans(req: Request, res: Response) {
  let rows = all(`SELECT l.*, c.first_name || ' ' || c.last_name AS customer_name FROM loans l JOIN customers c ON c.id = l.customer_id ORDER BY l.created_at DESC`).map(toLoan);
  const status = str(req.query.status).toUpperCase();
  const search = str(req.query.search).toLowerCase();
  if (status) rows = rows.filter((l) => l.status === status);
  if (search) rows = rows.filter((l) => [l.applicationId, l.customerName, l.loanType].some((v) => String(v).toLowerCase().includes(search)));
  rows = sortRows(rows, str(req.query.sortBy) || 'createdAt', str(req.query.order) || 'desc', ['createdAt', 'requestedAmount', 'customerName', 'status', 'loanType']);
  res.json(paginate(rows, req.query.page, req.query.pageSize, 10));
}

export function adminDecideLoan(req: Request, res: Response) {
  const decision = str(req.body?.decision).toUpperCase();
  validate([[!['APPROVE', 'REJECT'].includes(decision), 'decision', 'Decision must be APPROVE or REJECT.']]);
  const loan = get('SELECT * FROM loans WHERE id = ?', req.params.id);
  if (!loan) throw notFound('LOAN_NOT_FOUND', `Loan ${req.params.id} was not found.`);
  if (['APPROVED', 'REJECTED'].includes(loan.status)) throw badRequest('LOAN_ALREADY_DECIDED', `Loan ${loan.id} is already ${loan.status.toLowerCase()}.`);
  const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const reason = str(req.body?.reason) || (status === 'APPROVED' ? 'Approved by credit officer' : 'Rejected by credit officer');
  run('UPDATE loans SET status = ?, decision_reason = ?, updated_at = ? WHERE id = ?', status, reason, nowIso(), loan.id);
  notify(loan.customer_id, 'Loan', `Loan ${status.toLowerCase()}`, `Your ${loan.loan_type} application ${loan.id} was ${status.toLowerCase()}.`);
  res.json({ success: true, applicationId: loan.id, status, decisionReason: reason, message: `Loan ${status.toLowerCase()} successfully` });
}

export function adminTickets(req: Request, res: Response) {
  let rows = all(`SELECT t.*, c.first_name || ' ' || c.last_name AS customer_name FROM tickets t JOIN customers c ON c.id = t.customer_id ORDER BY t.created_at DESC`).map(toTicket);
  const status = str(req.query.status).toUpperCase();
  const priority = str(req.query.priority);
  const search = str(req.query.search).toLowerCase();
  if (status) rows = rows.filter((t) => t.status === status);
  if (priority) rows = rows.filter((t) => t.priority === priority);
  if (search) rows = rows.filter((t) => [t.ticketId, t.subject, t.customerName, t.category].some((v) => String(v).toLowerCase().includes(search)));
  rows = sortRows(rows, str(req.query.sortBy) || 'createdAt', str(req.query.order) || 'desc', ['createdAt', 'priority', 'status', 'customerName', 'ticketId']);
  res.json(paginate(rows, req.query.page, req.query.pageSize, 10));
}

export function adminUpdateTicket(req: Request, res: Response) {
  const status = str(req.body?.status).toUpperCase();
  validate([[!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status), 'status', 'Status must be OPEN, IN_PROGRESS, RESOLVED or CLOSED.']]);
  const t = get('SELECT * FROM tickets WHERE id = ?', req.params.id);
  if (!t) throw notFound('TICKET_NOT_FOUND', `Ticket ${req.params.id} was not found.`);
  run('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), t.id);
  res.json({ success: true, ticketId: t.id, previousStatus: t.status, status, message: `Ticket ${t.id} updated to ${status}` });
}
