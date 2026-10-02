export interface ApiEndpointDoc {
  group: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL';
  path: string;
  description: string;
  auth: 'none' | 'customer' | 'admin' | 'any';
  request?: unknown;
  response: unknown;
  statusCodes: Array<[number, string]>;
}

const UNAUTH: [number, string] = [401, 'Unauthorized / INVALID_TOKEN / SESSION_EXPIRED'];
const SERVER: [number, string] = [500, 'Server error (use failure injection to trigger)'];

export const API_CATALOG: ApiEndpointDoc[] = [
  // ---------------- Auth
  { group: 'Auth', method: 'POST', path: '/api/auth/login', description: 'Log in and receive a session (cookie `pb_session` + `sessionId` usable as a Bearer token).', auth: 'none',
    request: { username: 'john', password: 'Demo@123', rememberMe: false },
    response: { success: true, userId: 'USR-102938', sessionId: 'SES-837261-…', role: 'CUSTOMER', message: 'Login successful' },
    statusCodes: [[200, 'Logged in'], [400, 'USERNAME_REQUIRED / PASSWORD_REQUIRED'], [401, 'INVALID_USERNAME / INVALID_PASSWORD'], [403, 'ACCOUNT_DISABLED'], [423, 'ACCOUNT_LOCKED']] },
  { group: 'Auth', method: 'POST', path: '/api/auth/logout', description: 'Destroy the current session.', auth: 'any', response: { success: true, message: 'You have been logged out successfully' }, statusCodes: [[200, 'Logged out']] },
  { group: 'Auth', method: 'POST', path: '/api/auth/register', description: 'Register a new customer. Creates a checking account with a $1,000 welcome bonus.', auth: 'none',
    request: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', username: 'ada_l', password: 'Secret123', confirmPassword: 'Secret123', acceptTerms: true },
    response: { success: true, customerId: 'CUS-…', userId: 'USR-…', accountNumber: 'CHK-…' }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR'], [409, 'USERNAME_TAKEN']] },
  { group: 'Auth', method: 'POST', path: '/api/auth/forgot-password', description: 'Request password reset instructions.', auth: 'none', request: { usernameOrEmail: 'john' }, response: { success: true, resetRequestId: 'RST-…' }, statusCodes: [[200, 'Accepted'], [400, 'IDENTIFIER_REQUIRED']] },
  { group: 'Auth', method: 'GET', path: '/api/auth/me', description: 'Current user profile.', auth: 'any', response: { success: true, userId: 'USR-102938', role: 'CUSTOMER', customer: {} }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Auth', method: 'POST', path: '/api/auth/expire-session', description: 'LAB: force the current session to expire.', auth: 'any', response: { success: true }, statusCodes: [[200, 'Expired'], [401, 'No session']] },

  // ---------------- Accounts
  { group: 'Accounts', method: 'GET', path: '/api/dashboard', description: 'Customer dashboard: balances, recent transactions, pending payments, notifications.', auth: 'customer', response: { success: true, balances: { total: 0, checking: 0, savings: 0, credit: 0 } }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Accounts', method: 'GET', path: '/api/accounts', description: 'List the customer’s accounts.', auth: 'customer', response: { success: true, count: 3, data: [{ accountNumber: 'CHK-102938', accountType: 'CHECKING', currentBalance: 0, availableBalance: 0, status: 'ACTIVE', currency: 'USD' }] }, statusCodes: [[200, 'OK'], UNAUTH, SERVER] },
  { group: 'Accounts', method: 'GET', path: '/api/accounts/:id', description: 'Account details with the 10 most recent transactions.', auth: 'customer', response: { success: true, data: { accountNumber: 'CHK-102938', recentTransactions: [] } }, statusCodes: [[200, 'OK'], [404, 'ACCOUNT_NOT_FOUND'], UNAUTH] },
  { group: 'Accounts', method: 'POST', path: '/api/accounts', description: 'Open a new account, optionally funded from an existing account.', auth: 'customer', request: { accountType: 'SAVINGS', nickname: 'Vacation', initialDeposit: 500, fundingAccount: 'CHK-102938' }, response: { success: true, accountNumber: 'SAV-…', status: 'ACTIVE' }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR'], [422, 'INSUFFICIENT_BALANCE / ACCOUNT_LIMIT_REACHED'], UNAUTH] },
  { group: 'Accounts', method: 'POST', path: '/api/deposits', description: 'Deposit cash into an account.', auth: 'customer', request: { accountId: 'CHK-102938', amount: 250 }, response: { success: true, transactionId: 'TXN-…', balanceAfter: 0 }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR'], UNAUTH] },
  { group: 'Accounts', method: 'POST', path: '/api/withdrawals', description: 'Withdraw cash from an account.', auth: 'customer', request: { accountId: 'CHK-102938', amount: 100 }, response: { success: true, transactionId: 'TXN-…' }, statusCodes: [[201, 'Created'], [422, 'INSUFFICIENT_BALANCE'], UNAUTH] },

  // ---------------- Transactions
  { group: 'Transactions', method: 'GET', path: '/api/transactions', description: 'Search, filter, sort and paginate transactions. Query: search, status, type, accountId, fromDate, toDate, minAmount, maxAmount, sortBy, order, page, pageSize.', auth: 'customer',
    response: { success: true, data: [{ transactionId: 'TXN-…', date: '…', description: 'Amazon Marketplace Order', type: 'Payment', amount: 249.99, status: 'Completed', balanceAfter: 0 }], pagination: { page: 1, pageSize: 10, total: 128, totalPages: 13 } },
    statusCodes: [[200, 'OK'], UNAUTH, SERVER] },
  { group: 'Transactions', method: 'GET', path: '/api/transactions/:id', description: 'One transaction.', auth: 'customer', response: { success: true, data: { transactionId: 'TXN-…' } }, statusCodes: [[200, 'OK'], [404, 'TRANSACTION_NOT_FOUND'], UNAUTH] },

  // ---------------- Transfers
  { group: 'Transfers', method: 'POST', path: '/api/transfers', description: 'Transfer money between own accounts or to a beneficiary. Demo OTP is 123456.', auth: 'customer',
    request: { fromAccount: 'CHK-102938', transferType: 'OWN_ACCOUNT', toAccount: 'SAV-827364', amount: 500, description: 'Savings', scheduleTransfer: false, otp: '123456' },
    response: { success: true, transactionId: 'TXN-928371', fromAccount: 'CHK-102938', toAccount: 'SAV-827364', amount: 500, status: 'COMPLETED', message: 'Transfer completed successfully' },
    statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR / INVALID_OTP / SAME_ACCOUNT'], [404, 'INVALID_ACCOUNT / INVALID_BENEFICIARY'], [409, 'DUPLICATE_TRANSFER'], [422, 'INSUFFICIENT_BALANCE'], UNAUTH, SERVER] },
  { group: 'Transfers', method: 'GET', path: '/api/transfers', description: 'Transfer history.', auth: 'customer', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], UNAUTH] },

  // ---------------- Payments
  { group: 'Payments', method: 'GET', path: '/api/payments/billers', description: 'Supported billers.', auth: 'customer', response: { success: true, data: [{ code: 'ELECTRICITY', name: 'Electricity' }] }, statusCodes: [[200, 'OK']] },
  { group: 'Payments', method: 'POST', path: '/api/payments', description: 'Pay a bill (channel WEB) or pay by card through the secure gateway (channel GATEWAY: cardNumber, expiry, cvv, cardHolder, otp, merchant).', auth: 'customer',
    request: { biller: 'Electricity', customerNumber: 'ELE123456', amount: 1250, accountId: 'CHK-102938', paymentDate: '2026-10-02' },
    response: { success: true, paymentId: 'PAY-827361', biller: 'Electricity', amount: 1250, status: 'SUCCESS' },
    statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR / INVALID_OTP / CARD_EXPIRED'], [402, 'CARD_DECLINED'], [422, 'INSUFFICIENT_BALANCE'], [504, 'PAYMENT_TIMEOUT'], UNAUTH, SERVER] },
  { group: 'Payments', method: 'GET', path: '/api/payments', description: 'Payment history (optional ?status=).', auth: 'customer', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], UNAUTH] },

  // ---------------- Loans
  { group: 'Loans', method: 'POST', path: '/api/loans', description: 'Apply for a loan. Applications with debt-to-income > 50% are rejected automatically.', auth: 'customer',
    request: { loanType: 'Home Loan', requestedAmount: 250000, tenure: 240, employmentType: 'Salaried', monthlyIncome: 9000, existingEmi: 300, purpose: 'Buy a new home' },
    response: { success: true, applicationId: 'LOAN-827361', status: 'UNDER_REVIEW', requestedAmount: 250000 }, statusCodes: [[201, 'Created (UNDER_REVIEW or REJECTED)'], [400, 'VALIDATION_ERROR'], UNAUTH] },
  { group: 'Loans', method: 'GET', path: '/api/loans', description: 'Loan applications.', auth: 'customer', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Loans', method: 'GET', path: '/api/loans/:id', description: 'One loan application.', auth: 'customer', response: { success: true, data: {} }, statusCodes: [[200, 'OK'], [404, 'LOAN_NOT_FOUND']] },

  // ---------------- Cards
  { group: 'Cards', method: 'GET', path: '/api/cards', description: 'Cards with masked numbers.', auth: 'customer', response: { success: true, data: [{ cardId: 'CRD-…', maskedNumber: '**** **** **** 8273', status: 'ACTIVE' }] }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Cards', method: 'POST', path: '/api/cards', description: 'Request a new card.', auth: 'customer', request: { cardType: 'DEBIT', accountId: 'CHK-102938' }, response: { success: true, cardId: 'CRD-…' }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR / INVALID_ACCOUNT']] },
  { group: 'Cards', method: 'PATCH', path: '/api/cards/:id/freeze', description: 'Freeze a card.', auth: 'customer', response: { success: true, message: 'Card frozen successfully' }, statusCodes: [[200, 'OK'], [404, 'CARD_NOT_FOUND'], [409, 'CARD_ALREADY_FROZEN']] },
  { group: 'Cards', method: 'PATCH', path: '/api/cards/:id/unfreeze', description: 'Unfreeze a card.', auth: 'customer', response: { success: true }, statusCodes: [[200, 'OK'], [409, 'CARD_NOT_FROZEN']] },
  { group: 'Cards', method: 'PATCH', path: '/api/cards/:id/pin', description: 'Change PIN.', auth: 'customer', request: { pin: '4826', confirmPin: '4826' }, response: { success: true }, statusCodes: [[200, 'OK'], [400, 'VALIDATION_ERROR']] },
  { group: 'Cards', method: 'PATCH', path: '/api/cards/:id/limit', description: 'Set spending limit ($100-$50,000).', auth: 'customer', request: { spendingLimit: 3000 }, response: { success: true }, statusCodes: [[200, 'OK'], [400, 'VALIDATION_ERROR']] },
  { group: 'Cards', method: 'POST', path: '/api/cards/:id/report-lost', description: 'Block the card and issue a replacement.', auth: 'customer', response: { success: true, replacementCard: {} }, statusCodes: [[200, 'OK'], [422, 'CARD_BLOCKED']] },

  // ---------------- Beneficiaries
  { group: 'Beneficiaries', method: 'GET', path: '/api/beneficiaries', description: 'List / search (?search=) beneficiaries.', auth: 'customer', response: { success: true, data: [{ id: 'BEN-…', name: 'Alice Johnson' }] }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Beneficiaries', method: 'POST', path: '/api/beneficiaries', description: 'Add a beneficiary.', auth: 'customer', request: { name: 'Jane Doe', accountNumber: '123456789012', bank: 'Chase Bank', ifsc: 'CHAS0123456', nickname: 'Jane' }, response: { success: true, id: 'BEN-…' }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR'], [409, 'DUPLICATE_BENEFICIARY']] },
  { group: 'Beneficiaries', method: 'PUT', path: '/api/beneficiaries/:id', description: 'Update a beneficiary.', auth: 'customer', request: { nickname: 'Janey' }, response: { success: true }, statusCodes: [[200, 'OK'], [404, 'BENEFICIARY_NOT_FOUND'], [409, 'DUPLICATE_BENEFICIARY']] },
  { group: 'Beneficiaries', method: 'DELETE', path: '/api/beneficiaries/:id', description: 'Delete a beneficiary.', auth: 'customer', response: { success: true, message: 'Beneficiary … deleted successfully' }, statusCodes: [[200, 'OK'], [404, 'BENEFICIARY_NOT_FOUND']] },

  // ---------------- Notifications & support
  { group: 'Notifications', method: 'GET', path: '/api/notifications', description: 'Notifications (?type=Security&status=unread).', auth: 'customer', response: { success: true, unreadCount: 8, data: [] }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Notifications', method: 'PATCH', path: '/api/notifications/:id/read', description: 'Mark as read.', auth: 'customer', response: { success: true }, statusCodes: [[200, 'OK'], [404, 'NOTIFICATION_NOT_FOUND']] },
  { group: 'Notifications', method: 'POST', path: '/api/notifications/read-all', description: 'Mark all as read.', auth: 'customer', response: { success: true, updated: 8 }, statusCodes: [[200, 'OK']] },
  { group: 'Notifications', method: 'DELETE', path: '/api/notifications/:id', description: 'Delete a notification.', auth: 'customer', response: { success: true }, statusCodes: [[200, 'OK'], [404, 'NOTIFICATION_NOT_FOUND']] },
  { group: 'Support', method: 'POST', path: '/api/support/tickets', description: 'Create a support ticket (JSON or multipart with optional `attachment`).', auth: 'customer', request: { category: 'Card Services', subject: 'Card blocked', description: 'My card stopped working yesterday.', priority: 'High' }, response: { success: true, ticketId: 'TKT-928371', status: 'OPEN' }, statusCodes: [[201, 'Created'], [400, 'VALIDATION_ERROR'], [413, 'FILE_TOO_LARGE'], [415, 'UNSUPPORTED_FILE_TYPE']] },
  { group: 'Support', method: 'GET', path: '/api/support/tickets', description: 'My tickets.', auth: 'customer', response: { success: true, data: [] }, statusCodes: [[200, 'OK']] },

  // ---------------- Files
  { group: 'Files', method: 'POST', path: '/api/documents', description: 'Upload a KYC / address / income document (multipart: file, category). PDF, PNG or JPG up to 5 MB.', auth: 'customer', request: 'multipart/form-data: file=@kyc.pdf, category="KYC Document"', response: { success: true, documentId: 'DOC-…', fileName: 'kyc.pdf', fileSize: 1024, status: 'VERIFIED' }, statusCodes: [[201, 'Created'], [400, 'FILE_REQUIRED'], [413, 'FILE_TOO_LARGE'], [415, 'UNSUPPORTED_FILE_TYPE']] },
  { group: 'Files', method: 'GET', path: '/api/documents', description: 'Uploaded documents.', auth: 'customer', response: { success: true, data: [] }, statusCodes: [[200, 'OK']] },
  { group: 'Files', method: 'GET', path: '/api/downloads/statement', description: 'Download account statement (?accountId=&format=pdf|csv).', auth: 'customer', response: 'attachment; filename="statement-CHK-102938-2026-10.pdf"', statusCodes: [[200, 'File'], [404, 'ACCOUNT_NOT_FOUND']] },
  { group: 'Files', method: 'GET', path: '/api/downloads/transactions-report', description: 'Download filtered transactions as CSV (same filters as /api/transactions).', auth: 'customer', response: 'attachment; filename="transaction-report-2026-10-02.csv"', statusCodes: [[200, 'File']] },
  { group: 'Files', method: 'GET', path: '/api/downloads/loan-agreement/:id', description: 'Download a loan agreement PDF.', auth: 'customer', response: 'attachment; filename="loan-agreement-LOAN-….pdf"', statusCodes: [[200, 'File'], [404, 'LOAN_NOT_FOUND']] },

  // ---------------- Admin
  { group: 'Admin', method: 'GET', path: '/api/admin/customers', description: 'Customers (search, status, segment, sortBy, order, page, pageSize).', auth: 'admin', response: { success: true, data: [], pagination: {} }, statusCodes: [[200, 'OK'], UNAUTH, [403, 'FORBIDDEN']] },
  { group: 'Admin', method: 'PATCH', path: '/api/admin/customers/:id/status', description: 'Enable / disable a customer.', auth: 'admin', request: { status: 'DISABLED' }, response: { success: true }, statusCodes: [[200, 'OK'], [403, 'FORBIDDEN'], [404, 'CUSTOMER_NOT_FOUND']] },
  { group: 'Admin', method: 'GET', path: '/api/admin/transactions', description: 'All transactions.', auth: 'admin', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], [403, 'FORBIDDEN']] },
  { group: 'Admin', method: 'GET', path: '/api/admin/loans', description: 'All loan applications.', auth: 'admin', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], [403, 'FORBIDDEN']] },
  { group: 'Admin', method: 'PATCH', path: '/api/admin/loans/:id', description: 'Approve or reject a loan.', auth: 'admin', request: { decision: 'APPROVE', reason: 'Good credit history' }, response: { success: true, status: 'APPROVED' }, statusCodes: [[200, 'OK'], [400, 'LOAN_ALREADY_DECIDED'], [403, 'FORBIDDEN']] },
  { group: 'Admin', method: 'GET', path: '/api/admin/tickets', description: 'All support tickets.', auth: 'admin', response: { success: true, data: [] }, statusCodes: [[200, 'OK'], [403, 'FORBIDDEN']] },
  { group: 'Admin', method: 'PATCH', path: '/api/admin/tickets/:id', description: 'Update ticket status.', auth: 'admin', request: { status: 'RESOLVED' }, response: { success: true }, statusCodes: [[200, 'OK'], [403, 'FORBIDDEN']] },

  // ---------------- Lab
  { group: 'Automation Lab', method: 'GET', path: '/api/lab/info', description: 'Demo credentials, OTP and test card numbers.', auth: 'none', response: { success: true, demo: {} }, statusCodes: [[200, 'OK']] },
  { group: 'Automation Lab', method: 'POST', path: '/api/lab/reset', description: 'Restore the deterministic seed dataset.', auth: 'any', response: { success: true, seed: 20260101 }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Automation Lab', method: 'POST', path: '/api/lab/generate', description: 'Generate a new randomized dataset.', auth: 'any', response: { success: true }, statusCodes: [[200, 'OK'], UNAUTH] },
  { group: 'Automation Lab', method: 'POST', path: '/api/lab/simulation', description: 'Configure failure injection & delays for this browser.', auth: 'none', request: { failure: { mode: '500', endpoint: '/api/transfers', method: 'POST', times: 1 }, delays: { '/api/accounts': 3000 } }, response: { success: true, config: {} }, statusCodes: [[200, 'OK'], [400, 'INVALID_MODE']] },
  { group: 'Automation Lab', method: 'DELETE', path: '/api/lab/simulation', description: 'Clear simulation settings.', auth: 'none', response: { success: true }, statusCodes: [[200, 'OK']] },
  { group: 'Automation Lab', method: 'ALL', path: '/api/lab/echo', description: 'Echoes method, query, headers and body — verify request modification.', auth: 'none', request: { any: 'payload' }, response: { success: true, method: 'POST', body: {} }, statusCodes: [[200, 'GET'], [201, 'POST']] },
  { group: 'Automation Lab', method: 'GET', path: '/api/lab/slow', description: 'Responds after ?ms= milliseconds (max 15000).', auth: 'none', response: { success: true, delayedBy: 2000 }, statusCodes: [[200, 'OK']] },
  { group: 'Automation Lab', method: 'GET', path: '/api/lab/fx-rates', description: 'Dynamic FX quote — different every call.', auth: 'none', response: { success: true, quoteId: 'FX-…', rates: {} }, statusCodes: [[200, 'OK']] },
  { group: 'Automation Lab', method: 'GET', path: '/api/lab/db/:table', description: 'Read-only database inspector for consistency checks (accounts, transactions, transfers, payments, loans, beneficiaries, cards, notifications, tickets, documents).', auth: 'any', response: { success: true, table: 'accounts', rows: [] }, statusCodes: [[200, 'OK'], [404, 'UNKNOWN_TABLE'], UNAUTH] },
];
