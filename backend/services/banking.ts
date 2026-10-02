import { all, get, run, tx, type Row } from '../database/db.js';
import { ApiError, badRequest, conflict, notFound, unprocessable, validate, num, str } from '../utils/http.js';
import { newId, nowIso, round2 } from '../utils/ids.js';
import { DEMO_OTP } from '../../seed/seed.js';

export const BILLERS = [
  { code: 'ELECTRICITY', name: 'Electricity', provider: 'Con Edison' },
  { code: 'WATER', name: 'Water', provider: 'City Water Board' },
  { code: 'INTERNET', name: 'Internet', provider: 'Xfinity' },
  { code: 'MOBILE', name: 'Mobile', provider: 'Verizon Wireless' },
  { code: 'CREDIT_CARD', name: 'Credit Card', provider: 'ParaBank Card Services' },
  { code: 'INSURANCE', name: 'Insurance', provider: 'State Farm' },
];

export function ownedAccount(customerId: string, accountId: string): Row {
  const acc = get('SELECT * FROM accounts WHERE id = ? AND customer_id = ?', accountId, customerId);
  if (!acc) throw notFound('INVALID_ACCOUNT', `Account ${accountId || '(empty)'} was not found.`);
  if (acc.status !== 'ACTIVE') throw unprocessable('ACCOUNT_INACTIVE', `Account ${accountId} is ${acc.status.toLowerCase()}.`);
  return acc;
}

/** Posts a ledger entry and updates the account balance. Returns the new transaction id. */
export function postEntry(opts: {
  accountId: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  type: string;
  description: string;
  status?: string;
  category?: string;
  reference?: string;
}): { transactionId: string; balanceAfter: number } {
  const acc = get('SELECT * FROM accounts WHERE id = ?', opts.accountId)!;
  const isCredit = acc.type === 'CREDIT';
  const sign = opts.direction === 'CREDIT' ? 1 : -1;
  const newBalance = round2(isCredit ? acc.balance - sign * opts.amount : acc.balance + sign * opts.amount);
  const available = isCredit ? round2((acc.credit_limit ?? 0) - newBalance) : newBalance;
  run('UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?', newBalance, available, acc.id);
  const transactionId = newId('TXN');
  run(
    'INSERT INTO transactions (id, account_id, date, description, type, amount, direction, status, balance_after, reference, category) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    transactionId, acc.id, nowIso(), opts.description, opts.type, round2(opts.amount), opts.direction,
    opts.status ?? 'Completed', newBalance, opts.reference ?? null, opts.category ?? opts.type,
  );
  return { transactionId, balanceAfter: newBalance };
}

export function notify(customerId: string, type: string, title: string, message: string) {
  run('INSERT INTO notifications (id, customer_id, type, title, message, is_read, created_at) VALUES (?,?,?,?,?,0,?)', newId('NTF'), customerId, type, title, message, nowIso());
}

function checkOtp(otp: unknown) {
  if (!str(otp)) throw badRequest('OTP_REQUIRED', 'Please enter the one-time password (OTP).');
  if (str(otp) !== DEMO_OTP) throw badRequest('INVALID_OTP', 'The OTP you entered is incorrect.');
}

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------- Transfers
export function createTransfer(customerId: string, body: any) {
  const amount = num(body.amount);
  const fromAccount = str(body.fromAccount);
  const transferType = str(body.transferType || (body.beneficiaryId ? 'BENEFICIARY' : 'OWN_ACCOUNT')).toUpperCase();
  const schedule = body.scheduleTransfer === true || body.scheduleTransfer === 'true';
  const transferDate = str(body.transferDate);

  validate([
    [!fromAccount, 'fromAccount', 'Please select the account to transfer from.'],
    [!['OWN_ACCOUNT', 'BENEFICIARY'].includes(transferType), 'transferType', 'Transfer type must be OWN_ACCOUNT or BENEFICIARY.'],
    [transferType === 'OWN_ACCOUNT' && !str(body.toAccount), 'toAccount', 'Please select the destination account.'],
    [transferType === 'BENEFICIARY' && !str(body.beneficiaryId), 'beneficiaryId', 'Please select a beneficiary.'],
    [Number.isNaN(amount), 'amount', 'Please enter an amount.'],
    [!Number.isNaN(amount) && amount <= 0, 'amount', 'Amount must be greater than zero.'],
    [amount > 1_000_000, 'amount', 'Amount exceeds the per-transfer limit of $1,000,000.'],
    [!Number.isNaN(amount) && Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6, 'amount', 'Amount can have at most 2 decimal places.'],
    [schedule && !transferDate, 'transferDate', 'Please choose a transfer date for a scheduled transfer.'],
  ]);
  checkOtp(body.otp);

  const from = ownedAccount(customerId, fromAccount);
  if (from.type === 'CREDIT') throw badRequest('INVALID_ACCOUNT', 'Transfers cannot be made from a credit account.');

  let toAccount: string;
  let beneficiary: Row | undefined;
  let to: Row | undefined;
  if (transferType === 'OWN_ACCOUNT') {
    toAccount = str(body.toAccount);
    to = get('SELECT * FROM accounts WHERE id = ? AND customer_id = ?', toAccount, customerId);
    if (!to) throw notFound('INVALID_ACCOUNT', `Destination account ${toAccount} does not exist.`);
    if (to.id === from.id) throw badRequest('SAME_ACCOUNT', 'Source and destination accounts must be different.');
  } else {
    beneficiary = get('SELECT * FROM beneficiaries WHERE id = ? AND customer_id = ?', str(body.beneficiaryId), customerId);
    if (!beneficiary) throw notFound('INVALID_BENEFICIARY', `Beneficiary ${str(body.beneficiaryId)} was not found.`);
    toAccount = beneficiary.account_number;
  }

  if (schedule) {
    const when = new Date(transferDate);
    const today = new Date(new Date().toISOString().slice(0, 10));
    if (Number.isNaN(when.getTime()) || when < today) throw badRequest('INVALID_DATE', 'Transfer date must be today or later.');
  }

  // Duplicate detection: same route + amount within 60 seconds
  const recent = get(
    `SELECT id FROM transfers WHERE customer_id = ? AND from_account = ? AND to_account = ? AND amount = ? AND status IN ('COMPLETED','SCHEDULED') AND created_at > ?`,
    customerId, from.id, toAccount, round2(amount), new Date(Date.now() - 60_000).toISOString(),
  );
  if (recent && body.allowDuplicate !== true) {
    throw conflict('DUPLICATE_TRANSFER', 'An identical transfer was submitted less than a minute ago.', { originalTransferId: recent.id });
  }

  if (!schedule && amount > from.available_balance) {
    throw unprocessable('INSUFFICIENT_BALANCE', 'Insufficient account balance', {
      availableBalance: from.available_balance,
      requestedAmount: amount,
    });
  }

  const description = str(body.description) || (beneficiary ? `Transfer to ${beneficiary.name}` : `Transfer to ${toAccount}`);
  return tx(() => {
    const transferId = newId('TRF');
    let transactionId: string | null = null;
    let status = 'SCHEDULED';
    let fromBalanceAfter = from.balance;
    if (!schedule) {
      status = 'COMPLETED';
      const debit = postEntry({ accountId: from.id, amount, direction: 'DEBIT', type: 'Transfer', description: `${description} (to ${toAccount})`, reference: transferId, category: 'Transfer' });
      transactionId = debit.transactionId;
      fromBalanceAfter = debit.balanceAfter;
      if (to) postEntry({ accountId: to.id, amount, direction: 'CREDIT', type: 'Transfer', description: `Transfer from ${from.id}`, reference: transferId, category: 'Transfer' });
    }
    run(
      'INSERT INTO transfers (id, customer_id, transaction_id, from_account, to_account, beneficiary_id, amount, transfer_type, description, scheduled_date, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      transferId, customerId, transactionId, from.id, toAccount, beneficiary?.id ?? null, round2(amount), transferType, description, schedule ? transferDate : null, status, nowIso(),
    );
    notify(customerId, 'Transaction', schedule ? 'Transfer scheduled' : 'Transfer completed', `${fmt(amount)} ${schedule ? `scheduled for ${transferDate}` : 'sent'} from ${from.id} to ${beneficiary ? beneficiary.name : toAccount}.`);
    return {
      success: true,
      transactionId: transactionId ?? transferId,
      transferId,
      fromAccount: from.id,
      toAccount,
      beneficiaryName: beneficiary?.name ?? null,
      amount: round2(amount),
      currency: 'USD',
      transferType,
      status,
      scheduledDate: schedule ? transferDate : null,
      balanceAfter: fromBalanceAfter,
      timestamp: nowIso(),
      message: schedule ? `Transfer scheduled for ${transferDate}` : 'Transfer completed successfully',
    };
  });
}

// ---------------------------------------------------------------- Payments
function luhn(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export async function createPayment(customerId: string, body: any) {
  const channel = str(body.channel || 'WEB').toUpperCase();
  return channel === 'GATEWAY' ? gatewayPayment(customerId, body) : billPayment(customerId, body);
}

function billPayment(customerId: string, body: any) {
  const amount = num(body.amount);
  const billerName = str(body.biller);
  const biller = BILLERS.find((b) => b.name.toLowerCase() === billerName.toLowerCase() || b.code === billerName.toUpperCase());
  const paymentDate = str(body.paymentDate) || new Date().toISOString().slice(0, 10);
  validate([
    [!billerName, 'biller', 'Please select a biller.'],
    [!!billerName && !biller, 'biller', `Unknown biller "${billerName}".`],
    [!str(body.customerNumber), 'customerNumber', 'Please enter your customer number with the biller.'],
    [!!str(body.customerNumber) && !/^[A-Za-z0-9-]{4,20}$/.test(str(body.customerNumber)), 'customerNumber', 'Customer number must be 4-20 letters or digits.'],
    [Number.isNaN(amount), 'amount', 'Please enter an amount.'],
    [!Number.isNaN(amount) && amount <= 0, 'amount', 'Amount must be greater than zero.'],
    [amount > 50000, 'amount', 'Bill payments are limited to $50,000.'],
    [!str(body.accountId), 'accountId', 'Please select a payment account.'],
  ]);
  const acc = ownedAccount(customerId, str(body.accountId));
  const today = new Date().toISOString().slice(0, 10);
  const scheduled = paymentDate > today;
  if (paymentDate < today) throw badRequest('INVALID_DATE', 'Payment date cannot be in the past.');
  if (!scheduled && acc.type !== 'CREDIT' && amount > acc.available_balance) {
    throw unprocessable('INSUFFICIENT_BALANCE', 'Insufficient account balance', { availableBalance: acc.available_balance, requestedAmount: amount });
  }
  if (!scheduled && acc.type === 'CREDIT' && amount > acc.available_balance) {
    throw unprocessable('CREDIT_LIMIT_EXCEEDED', 'This payment exceeds your available credit.', { availableBalance: acc.available_balance });
  }
  return tx(() => {
    const paymentId = newId('PAY');
    let transactionId: string | null = null;
    const status = scheduled ? 'SCHEDULED' : 'SUCCESS';
    if (!scheduled) {
      transactionId = postEntry({ accountId: acc.id, amount, direction: 'DEBIT', type: 'Payment', description: `Bill Payment - ${biller!.name} (${biller!.provider})`, reference: paymentId, category: 'Bills' }).transactionId;
    }
    run(
      'INSERT INTO payments (id, customer_id, transaction_id, biller, customer_number, amount, account_id, payment_date, channel, card_last4, reference, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      paymentId, customerId, transactionId, biller!.name, str(body.customerNumber), round2(amount), acc.id, paymentDate, 'WEB', null, str(body.reference) || null, status, nowIso(),
    );
    notify(customerId, 'Payment', scheduled ? 'Bill payment scheduled' : 'Bill payment successful', `${biller!.name} payment of ${fmt(amount)} ${scheduled ? `scheduled for ${paymentDate}` : 'was processed'}.`);
    return {
      success: true,
      paymentId,
      transactionId,
      biller: biller!.name,
      provider: biller!.provider,
      customerNumber: str(body.customerNumber),
      amount: round2(amount),
      accountId: acc.id,
      paymentDate,
      status,
      message: scheduled ? 'Payment scheduled successfully' : 'Payment completed successfully',
    };
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gatewayPayment(customerId: string, body: any) {
  const amount = num(body.amount);
  const cardNumber = str(body.cardNumber).replace(/\s+/g, '');
  const expiry = str(body.expiry);
  const merchant = str(body.merchant) || 'ParaBank Secure Merchant';
  validate([
    [!/^\d{13,19}$/.test(cardNumber), 'cardNumber', 'Card number must be 13-19 digits.'],
    [/^\d{13,19}$/.test(cardNumber) && !luhn(cardNumber), 'cardNumber', 'Card number is invalid.'],
    [!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry), 'expiry', 'Expiry must be in MM/YY format.'],
    [!/^\d{3,4}$/.test(str(body.cvv)), 'cvv', 'CVV must be 3 or 4 digits.'],
    [!str(body.cardHolder), 'cardHolder', 'Please enter the name on the card.'],
    [Number.isNaN(amount) || amount <= 0, 'amount', 'Amount must be greater than zero.'],
  ]);
  if (/^\d{2}\/\d{2}$/.test(expiry)) {
    const [mm, yy] = expiry.split('/').map(Number);
    if (new Date(2000 + yy, mm, 1) < new Date()) throw badRequest('CARD_EXPIRED', 'This card has expired.');
  }
  // Low-value payments (<= $100) do not require step-up OTP unless one was supplied.
  if (amount > 100 || str(body.otp)) checkOtp(body.otp);
  if (cardNumber === '4000000000000002') throw new ApiError(402, 'CARD_DECLINED', 'The card was declined by the issuer.');
  if (cardNumber === '4000000000000119') {
    await sleep(3000);
    throw new ApiError(504, 'PAYMENT_TIMEOUT', 'The payment gateway timed out. No money was debited.');
  }
  const acc = get(`SELECT * FROM accounts WHERE customer_id = ? AND type = 'CHECKING' AND status = 'ACTIVE' ORDER BY created_at LIMIT 1`, customerId);
  if (!acc) throw notFound('INVALID_ACCOUNT', 'No active checking account is linked to this card.');
  if (amount > acc.available_balance) {
    throw unprocessable('INSUFFICIENT_BALANCE', 'Insufficient account balance', { availableBalance: acc.available_balance, requestedAmount: amount });
  }
  return tx(() => {
    const paymentId = newId('PAY');
    const { transactionId, balanceAfter } = postEntry({ accountId: acc.id, amount, direction: 'DEBIT', type: 'Payment', description: `Gateway Payment - ${merchant}`, reference: paymentId, category: 'Shopping' });
    const last4 = cardNumber.slice(-4);
    run(
      'INSERT INTO payments (id, customer_id, transaction_id, biller, customer_number, amount, account_id, payment_date, channel, card_last4, reference, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      paymentId, customerId, transactionId, merchant, null, round2(amount), acc.id, new Date().toISOString().slice(0, 10), 'GATEWAY', last4, str(body.reference) || null, 'SUCCESS', nowIso(),
    );
    notify(customerId, 'Payment', 'Card payment successful', `${fmt(amount)} paid to ${merchant} with card ending ${last4}.`);
    return {
      success: true,
      paymentId,
      transactionId,
      biller: merchant,
      merchant,
      amount: round2(amount),
      cardLast4: last4,
      accountId: acc.id,
      balanceAfter,
      channel: 'GATEWAY',
      reference: str(body.reference) || null,
      status: 'SUCCESS',
      authorizationCode: `AUTH${Math.floor(100000 + Math.random() * 900000)}`,
      message: 'Payment authorized successfully',
    };
  });
}

export function listForCustomer(table: string, customerId: string, order = 'created_at DESC') {
  return all(`SELECT * FROM ${table} WHERE customer_id = ? ORDER BY ${order}`, customerId);
}
