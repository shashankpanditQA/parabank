import type { Request, Response } from 'express';
import { all, get, run, tx } from '../database/db.js';
import { customerId } from '../middleware/auth.js';
import { badRequest, conflict, notFound, str, num, validate, unprocessable } from '../utils/http.js';
import { digits, hashSecret, newId, nowIso, round2 } from '../utils/ids.js';
import { estimateEmi, toBeneficiary, toCard, toLoan } from '../models/mappers.js';
import { notify, ownedAccount } from '../services/banking.js';

// ---------------------------------------------------------------- Loans
export const LOAN_PRODUCTS: Record<string, { rate: number; min: number; max: number; maxTenure: number }> = {
  'Personal Loan': { rate: 10.5, min: 1000, max: 50000, maxTenure: 84 },
  'Home Loan': { rate: 6.75, min: 50000, max: 2000000, maxTenure: 360 },
  'Car Loan': { rate: 7.9, min: 5000, max: 150000, maxTenure: 84 },
  'Education Loan': { rate: 8.25, min: 2000, max: 250000, maxTenure: 180 },
};

export function applyLoan(req: Request, res: Response) {
  const cid = customerId(req);
  const b = req.body ?? {};
  const loanType = str(b.loanType);
  const product = LOAN_PRODUCTS[loanType];
  const amount = num(b.requestedAmount);
  const tenure = num(b.tenure ?? b.tenureMonths);
  const income = num(b.monthlyIncome);
  const existingEmi = b.existingEmi === '' || b.existingEmi == null ? 0 : num(b.existingEmi);
  validate([
    [!product, 'loanType', 'Please select a valid loan type.'],
    [Number.isNaN(amount), 'requestedAmount', 'Please enter the requested amount.'],
    [!!product && (amount < product.min || amount > product.max), 'requestedAmount', `${loanType} amount must be between $${product?.min.toLocaleString()} and $${product?.max.toLocaleString()}.`],
    [Number.isNaN(tenure) || tenure < 6, 'tenure', 'Tenure must be at least 6 months.'],
    [!!product && tenure > product.maxTenure, 'tenure', `Maximum tenure for a ${loanType} is ${product?.maxTenure} months.`],
    [!['Salaried', 'Self-Employed', 'Business Owner', 'Student', 'Retired'].includes(str(b.employmentType)), 'employmentType', 'Please select your employment type.'],
    [Number.isNaN(income) || income <= 0, 'monthlyIncome', 'Monthly income must be greater than zero.'],
    [Number.isNaN(existingEmi) || existingEmi < 0, 'existingEmi', 'Existing EMI cannot be negative.'],
    [str(b.purpose).length < 5, 'purpose', 'Please describe the purpose of the loan (at least 5 characters).'],
  ]);
  const newEmi = estimateEmi(amount, product.rate, tenure);
  const dti = (existingEmi + newEmi) / income;
  const rejected = dti > 0.5;
  const status = rejected ? 'REJECTED' : 'UNDER_REVIEW';
  const reason = rejected ? `Debt-to-income ratio of ${(dti * 100).toFixed(1)}% exceeds the 50% limit.` : null;
  const id = newId('LOAN');
  const now = nowIso();
  run(
    'INSERT INTO loans (id, customer_id, loan_type, requested_amount, tenure_months, employment_type, monthly_income, existing_emi, purpose, interest_rate, status, decision_reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    id, cid, loanType, round2(amount), tenure, str(b.employmentType), round2(income), round2(existingEmi), str(b.purpose), product.rate, status, reason, now, now,
  );
  notify(cid, 'Loan', rejected ? 'Loan application rejected' : 'Loan application received', rejected ? `Your ${loanType} application ${id} was rejected. ${reason}` : `Your ${loanType} application ${id} is under review.`);
  res.status(201).json({
    success: true,
    applicationId: id,
    loanType,
    status,
    requestedAmount: round2(amount),
    tenureMonths: tenure,
    interestRate: product.rate,
    estimatedEmi: newEmi,
    debtToIncomeRatio: Math.round(dti * 1000) / 1000,
    decisionReason: reason,
    message: rejected ? 'Loan application rejected' : 'Loan application submitted successfully',
  });
}

export function listLoans(req: Request, res: Response) {
  const rows = all('SELECT * FROM loans WHERE customer_id = ? ORDER BY created_at DESC', customerId(req)).map(toLoan);
  res.json({ success: true, count: rows.length, data: rows });
}

export function getLoan(req: Request, res: Response) {
  const row = get('SELECT * FROM loans WHERE id = ? AND customer_id = ?', req.params.id, customerId(req));
  if (!row) throw notFound('LOAN_NOT_FOUND', `Loan application ${req.params.id} was not found.`);
  res.json({ success: true, data: toLoan(row) });
}

// ---------------------------------------------------------------- Cards
function ownedCard(cid: string, id: string) {
  const card = get('SELECT * FROM cards WHERE id = ? AND customer_id = ?', id, cid);
  if (!card) throw notFound('CARD_NOT_FOUND', `Card ${id} was not found.`);
  return card;
}

export function listCards(req: Request, res: Response) {
  const rows = all('SELECT * FROM cards WHERE customer_id = ? ORDER BY created_at', customerId(req)).map(toCard);
  res.json({ success: true, count: rows.length, data: rows });
}

export function getCard(req: Request, res: Response) {
  res.json({ success: true, data: toCard(ownedCard(customerId(req), String(req.params.id))) });
}

export function requestCard(req: Request, res: Response) {
  const cid = customerId(req);
  const cardType = str(req.body?.cardType).toUpperCase();
  validate([
    [!['DEBIT', 'CREDIT'].includes(cardType), 'cardType', 'Card type must be DEBIT or CREDIT.'],
    [!str(req.body?.accountId), 'accountId', 'Please select the linked account.'],
  ]);
  const acc = ownedAccount(cid, str(req.body.accountId));
  if (cardType === 'CREDIT' && acc.type !== 'CREDIT') throw badRequest('INVALID_ACCOUNT', 'Credit cards must be linked to a credit account.');
  if (cardType === 'DEBIT' && acc.type === 'CREDIT') throw badRequest('INVALID_ACCOUNT', 'Debit cards must be linked to a checking or savings account.');
  const c = get('SELECT * FROM customers WHERE id = ?', cid)!;
  const id = newId('CRD');
  const yy = (new Date().getFullYear() + 4) % 100;
  run('INSERT INTO cards (id, customer_id, account_id, card_type, network, last4, holder_name, expiry, status, spending_limit, pin_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    id, cid, acc.id, cardType, cardType === 'CREDIT' ? 'MASTERCARD' : 'VISA', digits(4), `${c.first_name} ${c.last_name}`.toUpperCase(), `${String(new Date().getMonth() + 1).padStart(2, '0')}/${yy}`, 'ACTIVE', 2000, null, nowIso());
  notify(cid, 'Security', 'New card issued', `A new ${cardType.toLowerCase()} card linked to ${acc.id} has been issued.`);
  res.status(201).json({ success: true, ...toCard(get('SELECT * FROM cards WHERE id = ?', id)!), message: 'Card issued successfully' });
}

export function cardAction(action: 'freeze' | 'unfreeze' | 'pin' | 'limit' | 'report-lost') {
  return (req: Request, res: Response) => {
    const cid = customerId(req);
    const card = ownedCard(cid, String(req.params.id));
    if (card.status === 'LOST' || card.status === 'BLOCKED') throw unprocessable('CARD_BLOCKED', 'This card has been reported lost and can no longer be changed.');
    let message = '';
    let replacement: any = null;
    switch (action) {
      case 'freeze':
        if (card.status === 'FROZEN') throw conflict('CARD_ALREADY_FROZEN', 'This card is already frozen.');
        run(`UPDATE cards SET status = 'FROZEN' WHERE id = ?`, card.id);
        notify(cid, 'Security', 'Card frozen', `Your card ending ${card.last4} has been frozen.`);
        message = 'Card frozen successfully';
        break;
      case 'unfreeze':
        if (card.status !== 'FROZEN') throw conflict('CARD_NOT_FROZEN', 'This card is not frozen.');
        run(`UPDATE cards SET status = 'ACTIVE' WHERE id = ?`, card.id);
        message = 'Card unfrozen successfully';
        break;
      case 'pin': {
        const pin = str(req.body?.pin);
        validate([
          [!/^\d{4}$/.test(pin), 'pin', 'PIN must be exactly 4 digits.'],
          [['0000', '1234', '1111', '9999'].includes(pin), 'pin', 'This PIN is too easy to guess.'],
          [pin !== str(req.body?.confirmPin), 'confirmPin', 'PINs do not match.'],
        ]);
        run('UPDATE cards SET pin_hash = ? WHERE id = ?', hashSecret(pin), card.id);
        notify(cid, 'Security', 'Card PIN changed', `The PIN for your card ending ${card.last4} was changed.`);
        message = 'PIN changed successfully';
        break;
      }
      case 'limit': {
        const limit = num(req.body?.spendingLimit);
        validate([[Number.isNaN(limit) || limit < 100 || limit > 50000, 'spendingLimit', 'Spending limit must be between $100 and $50,000.']]);
        run('UPDATE cards SET spending_limit = ? WHERE id = ?', round2(limit), card.id);
        message = `Spending limit updated to $${limit.toLocaleString()}`;
        break;
      }
      case 'report-lost': {
        replacement = tx(() => {
          run(`UPDATE cards SET status = 'LOST' WHERE id = ?`, card.id);
          const id = newId('CRD');
          run('INSERT INTO cards (id, customer_id, account_id, card_type, network, last4, holder_name, expiry, status, spending_limit, pin_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            id, cid, card.account_id, card.card_type, card.network, digits(4), card.holder_name, card.expiry, 'PENDING_ACTIVATION', card.spending_limit, null, nowIso());
          return toCard(get('SELECT * FROM cards WHERE id = ?', id)!);
        });
        notify(cid, 'Security', 'Card reported lost', `Card ending ${card.last4} was blocked. A replacement card is on its way.`);
        message = 'Card reported lost. A replacement card has been issued.';
        break;
      }
    }
    res.json({ success: true, card: toCard(get('SELECT * FROM cards WHERE id = ?', card.id)!), replacementCard: replacement, message });
  };
}

// ---------------------------------------------------------------- Beneficiaries
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function validateBeneficiary(b: any) {
  validate([
    [str(b.name).length < 2, 'name', 'Beneficiary name must be at least 2 characters.'],
    [!/^\d{8,17}$/.test(str(b.accountNumber)), 'accountNumber', 'Account number must be 8-17 digits.'],
    [!str(b.bank), 'bank', 'Please select the beneficiary bank.'],
    [!IFSC_RE.test(str(b.ifsc).toUpperCase()), 'ifsc', 'IFSC must look like ABCD0123456 (4 letters, 0, 6 characters).'],
    [str(b.nickname).length > 20, 'nickname', 'Nickname can be at most 20 characters.'],
  ]);
}

export function listBeneficiaries(req: Request, res: Response) {
  const search = str(req.query.search ?? req.query.q).toLowerCase();
  let rows = all('SELECT * FROM beneficiaries WHERE customer_id = ? ORDER BY name', customerId(req)).map(toBeneficiary);
  if (search) rows = rows.filter((r) => [r.name, r.nickname, r.bank, r.accountNumber, r.ifsc].some((v) => String(v ?? '').toLowerCase().includes(search)));
  res.json({ success: true, count: rows.length, data: rows });
}

export function getBeneficiary(req: Request, res: Response) {
  const row = get('SELECT * FROM beneficiaries WHERE id = ? AND customer_id = ?', req.params.id, customerId(req));
  if (!row) throw notFound('BENEFICIARY_NOT_FOUND', `Beneficiary ${req.params.id} was not found.`);
  res.json({ success: true, data: toBeneficiary(row) });
}

export function addBeneficiary(req: Request, res: Response) {
  const cid = customerId(req);
  const b = req.body ?? {};
  validateBeneficiary(b);
  if (get('SELECT 1 FROM beneficiaries WHERE customer_id = ? AND account_number = ?', cid, str(b.accountNumber))) {
    throw conflict('DUPLICATE_BENEFICIARY', 'A beneficiary with this account number already exists.');
  }
  const id = newId('BEN');
  run('INSERT INTO beneficiaries (id, customer_id, name, account_number, bank, ifsc, nickname, created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, cid, str(b.name), str(b.accountNumber), str(b.bank), str(b.ifsc).toUpperCase(), str(b.nickname) || null, nowIso());
  notify(cid, 'Security', 'Beneficiary added', `${str(b.name)} was added as a beneficiary.`);
  res.status(201).json({ success: true, ...toBeneficiary(get('SELECT * FROM beneficiaries WHERE id = ?', id)!), message: 'Beneficiary added successfully' });
}

export function updateBeneficiary(req: Request, res: Response) {
  const cid = customerId(req);
  const existing = get('SELECT * FROM beneficiaries WHERE id = ? AND customer_id = ?', req.params.id, cid);
  if (!existing) throw notFound('BENEFICIARY_NOT_FOUND', `Beneficiary ${req.params.id} was not found.`);
  const merged = {
    name: req.body?.name ?? existing.name,
    accountNumber: req.body?.accountNumber ?? existing.account_number,
    bank: req.body?.bank ?? existing.bank,
    ifsc: req.body?.ifsc ?? existing.ifsc,
    nickname: req.body?.nickname ?? existing.nickname ?? '',
  };
  validateBeneficiary(merged);
  if (get('SELECT 1 FROM beneficiaries WHERE customer_id = ? AND account_number = ? AND id != ?', cid, str(merged.accountNumber), existing.id)) {
    throw conflict('DUPLICATE_BENEFICIARY', 'A beneficiary with this account number already exists.');
  }
  run('UPDATE beneficiaries SET name = ?, account_number = ?, bank = ?, ifsc = ?, nickname = ? WHERE id = ?',
    str(merged.name), str(merged.accountNumber), str(merged.bank), str(merged.ifsc).toUpperCase(), str(merged.nickname) || null, existing.id);
  res.json({ success: true, ...toBeneficiary(get('SELECT * FROM beneficiaries WHERE id = ?', existing.id)!), message: 'Beneficiary updated successfully' });
}

export function deleteBeneficiary(req: Request, res: Response) {
  const cid = customerId(req);
  const existing = get('SELECT * FROM beneficiaries WHERE id = ? AND customer_id = ?', req.params.id, cid);
  if (!existing) throw notFound('BENEFICIARY_NOT_FOUND', `Beneficiary ${req.params.id} was not found.`);
  run('DELETE FROM beneficiaries WHERE id = ?', existing.id);
  res.json({ success: true, id: existing.id, name: existing.name, message: `Beneficiary ${existing.name} deleted successfully` });
}
