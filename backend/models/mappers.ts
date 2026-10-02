/** Row → API mappers. API responses always use camelCase. */
import type { Row } from '../database/db.js';

export const toCustomer = (r: Row) => ({
  customerId: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  fullName: `${r.first_name} ${r.last_name}`,
  email: r.email,
  phone: r.phone,
  city: r.city,
  segment: r.segment,
  status: r.status,
  createdAt: r.created_at,
});

export const toAccount = (r: Row) => ({
  id: r.id,
  accountNumber: r.id,
  customerId: r.customer_id,
  accountType: r.type,
  nickname: r.nickname,
  currentBalance: r.balance,
  availableBalance: r.available_balance,
  creditLimit: r.credit_limit,
  status: r.status,
  currency: r.currency,
  createdDate: r.created_at,
});

export const toTransaction = (r: Row) => ({
  transactionId: r.id,
  date: r.date,
  description: r.description,
  type: r.type,
  amount: r.amount,
  direction: r.direction,
  signedAmount: r.direction === 'CREDIT' ? r.amount : -r.amount,
  accountId: r.account_id,
  accountType: r.account_type,
  status: r.status,
  balanceAfter: r.balance_after,
  reference: r.reference,
  category: r.category,
});

export const toBeneficiary = (r: Row) => ({
  id: r.id,
  name: r.name,
  accountNumber: r.account_number,
  maskedAccountNumber: `••••${String(r.account_number).slice(-4)}`,
  bank: r.bank,
  ifsc: r.ifsc,
  nickname: r.nickname,
  createdAt: r.created_at,
});

export const toPayment = (r: Row) => ({
  paymentId: r.id,
  transactionId: r.transaction_id,
  biller: r.biller,
  customerNumber: r.customer_number,
  amount: r.amount,
  accountId: r.account_id,
  paymentDate: r.payment_date,
  channel: r.channel,
  cardLast4: r.card_last4,
  reference: r.reference,
  status: r.status,
  createdAt: r.created_at,
});

export const toLoan = (r: Row) => ({
  applicationId: r.id,
  customerId: r.customer_id,
  customerName: r.customer_name,
  loanType: r.loan_type,
  requestedAmount: r.requested_amount,
  tenureMonths: r.tenure_months,
  employmentType: r.employment_type,
  monthlyIncome: r.monthly_income,
  existingEmi: r.existing_emi,
  purpose: r.purpose,
  interestRate: r.interest_rate,
  estimatedEmi: estimateEmi(r.requested_amount, r.interest_rate, r.tenure_months),
  status: r.status,
  decisionReason: r.decision_reason,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function estimateEmi(principal: number, annualRate: number, months: number) {
  const m = annualRate / 12 / 100;
  if (!m || !months) return 0;
  return Math.round(((principal * m * (1 + m) ** months) / ((1 + m) ** months - 1)) * 100) / 100;
}

export const toCard = (r: Row) => ({
  cardId: r.id,
  accountId: r.account_id,
  cardType: r.card_type,
  network: r.network,
  maskedNumber: `**** **** **** ${r.last4}`,
  last4: r.last4,
  holderName: r.holder_name,
  expiry: r.expiry,
  status: r.status,
  spendingLimit: r.spending_limit,
  pinSet: !!r.pin_hash,
  createdAt: r.created_at,
});

export const toNotification = (r: Row) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  message: r.message,
  read: !!r.is_read,
  createdAt: r.created_at,
});

export const toTicket = (r: Row) => ({
  ticketId: r.id,
  customerId: r.customer_id,
  customerName: r.customer_name,
  category: r.category,
  subject: r.subject,
  description: r.description,
  priority: r.priority,
  attachmentName: r.attachment_name,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toTransfer = (r: Row) => ({
  transferId: r.id,
  transactionId: r.transaction_id,
  fromAccount: r.from_account,
  toAccount: r.to_account,
  beneficiaryId: r.beneficiary_id,
  amount: r.amount,
  transferType: r.transfer_type,
  description: r.description,
  scheduledDate: r.scheduled_date,
  status: r.status,
  createdAt: r.created_at,
});

export const toDocument = (r: Row) => ({
  documentId: r.id,
  category: r.category,
  fileName: r.file_name,
  fileSize: r.file_size,
  mimeType: r.mime_type,
  status: r.status,
  uploadedAt: r.created_at,
});
