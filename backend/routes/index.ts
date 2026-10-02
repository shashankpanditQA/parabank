import { Router, type RequestHandler } from 'express';
import { ah } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as bank from '../controllers/bankingController.js';
import * as prod from '../controllers/productsController.js';
import * as svc from '../controllers/serviceController.js';
import * as admin from '../controllers/adminController.js';
import * as lab from '../controllers/labController.js';
import { API_CATALOG } from './catalog.js';

export const api = Router();
const A = requireAuth;
const ADMIN: RequestHandler[] = [requireAuth, requireRole('ADMIN')];

// Health & docs
api.get('/health', lab.health);
api.get('/docs', (_req, res) => res.json({ success: true, count: API_CATALOG.length, endpoints: API_CATALOG }));

// Auth
api.post('/auth/login', ah(auth.login));
api.post('/auth/logout', ah(auth.logout));
api.post('/auth/register', ah(auth.register));
api.post('/auth/forgot-password', ah(auth.forgotPassword));
api.get('/auth/me', A, ah(auth.me));
api.post('/auth/expire-session', ah(auth.expireSession));
api.get('/auth/session', ah(lab.sessionInfo));

// Dashboard & accounts
api.get('/dashboard', A, ah(bank.dashboard));
api.get('/accounts', A, ah(bank.listAccounts));
api.get('/accounts/:id', A, ah(bank.getAccount));
api.post('/accounts', A, ah(bank.openAccount));
api.post('/deposits', A, ah(bank.cashOperation('Deposit')));
api.post('/withdrawals', A, ah(bank.cashOperation('Withdrawal')));

// Transactions, transfers, payments
api.get('/transactions', A, ah(bank.listTransactions));
api.get('/transactions/:id', A, ah(bank.getTransaction));
api.post('/transfers', A, ah(bank.postTransfer));
api.get('/transfers', A, ah(bank.listTransfers));
api.get('/payments/billers', A, ah(bank.listBillers));
api.post('/payments', A, ah(bank.postPayment));
api.get('/payments', A, ah(bank.listPayments));

// Loans
api.post('/loans', A, ah(prod.applyLoan));
api.get('/loans', A, ah(prod.listLoans));
api.get('/loans/:id', A, ah(prod.getLoan));

// Cards
api.get('/cards', A, ah(prod.listCards));
api.post('/cards', A, ah(prod.requestCard));
api.get('/cards/:id', A, ah(prod.getCard));
api.patch('/cards/:id/freeze', A, ah(prod.cardAction('freeze')));
api.patch('/cards/:id/unfreeze', A, ah(prod.cardAction('unfreeze')));
api.patch('/cards/:id/pin', A, ah(prod.cardAction('pin')));
api.patch('/cards/:id/limit', A, ah(prod.cardAction('limit')));
api.post('/cards/:id/report-lost', A, ah(prod.cardAction('report-lost')));

// Beneficiaries
api.get('/beneficiaries', A, ah(prod.listBeneficiaries));
api.get('/beneficiaries/:id', A, ah(prod.getBeneficiary));
api.post('/beneficiaries', A, ah(prod.addBeneficiary));
api.put('/beneficiaries/:id', A, ah(prod.updateBeneficiary));
api.delete('/beneficiaries/:id', A, ah(prod.deleteBeneficiary));

// Notifications
api.get('/notifications', A, ah(svc.listNotifications));
api.post('/notifications/read-all', A, ah(svc.markAllRead));
api.patch('/notifications/:id/read', A, ah(svc.setNotificationRead(true)));
api.patch('/notifications/:id/unread', A, ah(svc.setNotificationRead(false)));
api.delete('/notifications/:id', A, ah(svc.deleteNotification));

// Support
api.post('/support/tickets', A, svc.upload.single('attachment'), ah(svc.createTicket));
api.get('/support/tickets', A, ah(svc.listTickets));

// Documents (upload) & downloads
api.post('/documents', A, svc.upload.single('file'), ah(svc.uploadDocument));
api.get('/documents', A, ah(svc.listDocuments));
api.delete('/documents/:id', A, ah(svc.deleteDocument));
api.get('/downloads/statement', A, ah(svc.downloadStatement));
api.get('/downloads/transactions-report', A, ah(svc.downloadTransactionReport));
api.get('/downloads/loan-agreement', A, ah(svc.downloadLoanAgreement));
api.get('/downloads/loan-agreement/:id', A, ah(svc.downloadLoanAgreement));

// Admin
api.get('/admin/stats', ...ADMIN, ah(admin.adminStats));
api.get('/admin/customers', ...ADMIN, ah(admin.adminCustomers));
api.patch('/admin/customers/:id/status', ...ADMIN, ah(admin.adminSetCustomerStatus));
api.get('/admin/transactions', ...ADMIN, ah(admin.adminTransactions));
api.get('/admin/loans', ...ADMIN, ah(admin.adminLoans));
api.patch('/admin/loans/:id', ...ADMIN, ah(admin.adminDecideLoan));
api.get('/admin/tickets', ...ADMIN, ah(admin.adminTickets));
api.patch('/admin/tickets/:id', ...ADMIN, ah(admin.adminUpdateTicket));

// Automation lab
api.get('/lab/info', ah(lab.labInfo));
api.post('/lab/reset', A, ah(lab.resetData));
api.post('/lab/generate', A, ah(lab.generateData));
api.get('/lab/simulation', ah(lab.getSimulationConfig));
api.post('/lab/simulation', ah(lab.setSimulationConfig));
api.delete('/lab/simulation', ah(lab.clearSimulation));
api.all('/lab/echo', ah(lab.echo));
api.get('/lab/slow', ah(lab.slow));
api.get('/lab/fx-rates', ah(lab.randomQuote));
api.get('/lab/directory', A, ah(lab.directory));
api.get('/lab/db/:table', A, ah(lab.dbInspect));
