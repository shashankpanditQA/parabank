import type { Request, Response } from 'express';
import multer from 'multer';
import { all, get, run } from '../database/db.js';
import { customerId } from '../middleware/auth.js';
import { ApiError, notFound, str, validate } from '../utils/http.js';
import { newId, nowIso } from '../utils/ids.js';
import { toDocument, toLoan, toNotification, toTicket, toTransaction } from '../models/mappers.js';
import { buildPdf, toCsv } from '../utils/files.js';
import { queryTransactions } from './bankingController.js';

const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg'];
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype) && !/\.(pdf|png|jpe?g)$/i.test(file.originalname)) {
      cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', `File type "${file.mimetype}" is not supported. Upload a PDF, PNG or JPG.`));
    } else cb(null, true);
  },
});

// ---------------------------------------------------------------- Notifications
export function listNotifications(req: Request, res: Response) {
  const cid = customerId(req);
  let rows = all('SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC', cid).map(toNotification);
  const type = str(req.query.type);
  const status = str(req.query.status).toLowerCase();
  if (type) rows = rows.filter((n) => n.type.toLowerCase() === type.toLowerCase());
  if (status === 'read') rows = rows.filter((n) => n.read);
  if (status === 'unread') rows = rows.filter((n) => !n.read);
  const unreadCount = get<{ c: number }>('SELECT COUNT(*) c FROM notifications WHERE customer_id = ? AND is_read = 0', cid)!.c;
  res.json({ success: true, count: rows.length, unreadCount, data: rows });
}

export function setNotificationRead(read: boolean) {
  return (req: Request, res: Response) => {
    const cid = customerId(req);
    const n = get('SELECT * FROM notifications WHERE id = ? AND customer_id = ?', req.params.id, cid);
    if (!n) throw notFound('NOTIFICATION_NOT_FOUND', `Notification ${req.params.id} was not found.`);
    run('UPDATE notifications SET is_read = ? WHERE id = ?', read ? 1 : 0, n.id);
    res.json({ success: true, data: toNotification(get('SELECT * FROM notifications WHERE id = ?', n.id)!) });
  };
}

export function markAllRead(req: Request, res: Response) {
  const r = run('UPDATE notifications SET is_read = 1 WHERE customer_id = ? AND is_read = 0', customerId(req));
  res.json({ success: true, updated: Number(r.changes), message: 'All notifications marked as read' });
}

export function deleteNotification(req: Request, res: Response) {
  const cid = customerId(req);
  const n = get('SELECT * FROM notifications WHERE id = ? AND customer_id = ?', req.params.id, cid);
  if (!n) throw notFound('NOTIFICATION_NOT_FOUND', `Notification ${req.params.id} was not found.`);
  run('DELETE FROM notifications WHERE id = ?', n.id);
  res.json({ success: true, id: n.id, message: 'Notification deleted' });
}

// ---------------------------------------------------------------- Support tickets
export function createTicket(req: Request, res: Response) {
  const cid = customerId(req);
  const b = req.body ?? {};
  validate([
    [!['Account', 'Card Services', 'Transactions', 'Loans', 'Online Banking', 'Other'].includes(str(b.category)), 'category', 'Please select a category.'],
    [str(b.subject).length < 5, 'subject', 'Subject must be at least 5 characters.'],
    [str(b.description).length < 15, 'description', 'Description must be at least 15 characters.'],
    [!['Low', 'Medium', 'High', 'Urgent'].includes(str(b.priority)), 'priority', 'Please select a priority.'],
  ]);
  const id = newId('TKT');
  const now = nowIso();
  const file = (req as any).file as Express.Multer.File | undefined;
  run('INSERT INTO tickets (id, customer_id, category, subject, description, priority, attachment_name, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    id, cid, str(b.category), str(b.subject), str(b.description), str(b.priority), file?.originalname ?? null, 'OPEN', now, now);
  res.status(201).json({
    success: true,
    ticketId: id,
    status: 'OPEN',
    priority: str(b.priority),
    category: str(b.category),
    attachment: file ? { fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype } : null,
    expectedResponse: str(b.priority) === 'Urgent' ? '4 hours' : str(b.priority) === 'High' ? '24 hours' : '3 business days',
    message: 'Support ticket created successfully',
  });
}

export function listTickets(req: Request, res: Response) {
  const rows = all('SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC', customerId(req)).map(toTicket);
  res.json({ success: true, count: rows.length, data: rows });
}

// ---------------------------------------------------------------- Documents (file upload)
export function uploadDocument(req: Request, res: Response) {
  const cid = customerId(req);
  const file = (req as any).file as Express.Multer.File | undefined;
  const category = str(req.body?.category);
  validate([[!['KYC Document', 'Address Proof', 'Income Proof'].includes(category), 'category', 'Category must be KYC Document, Address Proof or Income Proof.']]);
  if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Please choose a file to upload.');
  if (file.size === 0) throw new ApiError(400, 'EMPTY_FILE', 'The selected file is empty.');
  const id = newId('DOC');
  const status = category === 'KYC Document' ? 'VERIFIED' : 'UNDER_REVIEW';
  run('INSERT INTO documents (id, customer_id, category, file_name, file_size, mime_type, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, cid, category, file.originalname, file.size, file.mimetype, status, nowIso());
  res.status(201).json({ success: true, ...toDocument(get('SELECT * FROM documents WHERE id = ?', id)!), message: `${file.originalname} uploaded successfully` });
}

export function listDocuments(req: Request, res: Response) {
  const rows = all('SELECT * FROM documents WHERE customer_id = ? ORDER BY created_at DESC', customerId(req)).map(toDocument);
  res.json({ success: true, count: rows.length, data: rows });
}

export function deleteDocument(req: Request, res: Response) {
  const cid = customerId(req);
  const d = get('SELECT * FROM documents WHERE id = ? AND customer_id = ?', req.params.id, cid);
  if (!d) throw notFound('DOCUMENT_NOT_FOUND', `Document ${req.params.id} was not found.`);
  run('DELETE FROM documents WHERE id = ?', d.id);
  res.json({ success: true, id: d.id, message: 'Document deleted' });
}

// ---------------------------------------------------------------- Downloads
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function downloadStatement(req: Request, res: Response) {
  const cid = customerId(req);
  const accountId = str(req.query.accountId) || get('SELECT id FROM accounts WHERE customer_id = ? ORDER BY created_at LIMIT 1', cid)?.id;
  const acc = get('SELECT * FROM accounts WHERE id = ? AND customer_id = ?', accountId, cid);
  if (!acc) throw notFound('ACCOUNT_NOT_FOUND', `Account ${accountId} was not found.`);
  const c = get('SELECT * FROM customers WHERE id = ?', cid)!;
  const txs = all(`SELECT t.*, ? AS account_type FROM transactions t WHERE account_id = ? ORDER BY date DESC LIMIT 60`, acc.type, acc.id).map(toTransaction);
  const month = new Date().toISOString().slice(0, 7);
  const format = str(req.query.format).toLowerCase() === 'csv' ? 'csv' : 'pdf';
  const filename = `statement-${acc.id}-${month}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (format === 'csv') {
    res.type('text/csv').send(toCsv(['Transaction ID', 'Date', 'Description', 'Type', 'Amount', 'Status', 'Balance After'], txs.map((t) => [t.transactionId, t.date.slice(0, 10), t.description, t.type, t.signedAmount, t.status, t.balanceAfter])));
    return;
  }
  const lines = [
    `Customer: ${c.first_name} ${c.last_name} (${c.id})`,
    `Account: ${acc.id} - ${acc.type}`,
    `Statement period: ${month}`,
    `Current balance: ${money(acc.balance)}   Available: ${money(acc.available_balance)}`,
    '',
    'DATE        TRANSACTION ID   AMOUNT        STATUS      DESCRIPTION',
    ...txs.map((t) => `${t.date.slice(0, 10)}  ${t.transactionId.padEnd(15)}  ${money(t.signedAmount).padStart(12)}  ${t.status.padEnd(10)}  ${t.description}`),
  ];
  res.type('application/pdf').send(buildPdf('ParaBank Pro - Account Statement', lines));
}

export function downloadTransactionReport(req: Request, res: Response) {
  const rows = queryTransactions({ customerId: customerId(req) }, req.query);
  const filename = `transaction-report-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.type('text/csv').send(
    toCsv(['Transaction ID', 'Date', 'Description', 'Type', 'Amount', 'Direction', 'Account', 'Status', 'Balance After'],
      rows.map((t) => [t.transactionId, t.date, t.description, t.type, t.amount, t.direction, t.accountId, t.status, t.balanceAfter])),
  );
}

export function downloadLoanAgreement(req: Request, res: Response) {
  const cid = customerId(req);
  const loanId = str(req.params.id) || get('SELECT id FROM loans WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1', cid)?.id;
  const row = get('SELECT * FROM loans WHERE id = ? AND customer_id = ?', loanId, cid);
  if (!row) throw notFound('LOAN_NOT_FOUND', `Loan ${loanId} was not found.`);
  const loan = toLoan(row);
  const c = get('SELECT * FROM customers WHERE id = ?', cid)!;
  res.setHeader('Content-Disposition', `attachment; filename="loan-agreement-${loan.applicationId}.pdf"`);
  res.type('application/pdf').send(
    buildPdf('ParaBank Pro - Loan Agreement', [
      `Application ID: ${loan.applicationId}`,
      `Borrower: ${c.first_name} ${c.last_name} (${c.id})`,
      `Loan type: ${loan.loanType}`,
      `Principal: ${money(loan.requestedAmount)}`,
      `Tenure: ${loan.tenureMonths} months   Interest rate: ${loan.interestRate}% p.a.`,
      `Estimated EMI: ${money(loan.estimatedEmi)}`,
      `Status: ${loan.status}`,
      '',
      'This is a practice document generated by ParaBank Pro for automation training.',
      'It has no legal or financial validity.',
    ]),
  );
}
