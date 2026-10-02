import type { Request, Response } from 'express';
import { get, run, tx } from '../database/db.js';
import { ApiError, badRequest, conflict, validate, str } from '../utils/http.js';
import { hashSecret, newAccountNumber, newId, nowIso, verifySecret, digits } from '../utils/ids.js';
import { REMEMBER_TTL_MS, SESSION_TTL_MS, readToken } from '../middleware/auth.js';
import { toCustomer } from '../models/mappers.js';
import crypto from 'node:crypto';

const cookieOpts = (maxAge?: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== 'true',
  path: '/',
  ...(maxAge ? { maxAge } : {}),
});

export function login(req: Request, res: Response) {
  const username = str(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const rememberMe = req.body?.rememberMe === true || req.body?.rememberMe === 'true';
  const issueCookie = req.body?.issueCookie !== false;

  if (!username && !password) throw badRequest('CREDENTIALS_REQUIRED', 'Please enter your username and password.');
  if (!username) throw badRequest('USERNAME_REQUIRED', 'Please enter your username.');
  if (!password) throw badRequest('PASSWORD_REQUIRED', 'Please enter your password.');

  const user = get('SELECT * FROM users WHERE lower(username) = lower(?)', username);
  if (!user) throw new ApiError(401, 'INVALID_USERNAME', 'No account was found with that username.');
  if (!verifySecret(password, user.password_hash)) {
    run('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', user.id);
    throw new ApiError(401, 'INVALID_PASSWORD', 'The password you entered is incorrect.');
  }
  if (user.status === 'LOCKED') throw new ApiError(423, 'ACCOUNT_LOCKED', 'Your account has been locked. Please contact customer support.');
  if (user.status === 'DISABLED') throw new ApiError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled by an administrator.');

  const sessionId = `SES-${digits(6)}-${crypto.randomBytes(8).toString('hex')}`;
  const ttl = rememberMe ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  run('INSERT INTO sessions (id, user_id, created_at, expires_at, remember_me) VALUES (?,?,?,?,?)', sessionId, user.id, nowIso(), expiresAt, rememberMe ? 1 : 0);
  run('UPDATE users SET failed_attempts = 0, last_login = ? WHERE id = ?', nowIso(), user.id);
  // housekeeping: drop sessions expired more than a day ago
  run('DELETE FROM sessions WHERE expires_at < ?', new Date(Date.now() - 86400000).toISOString());

  const customer = user.customer_id ? get('SELECT * FROM customers WHERE id = ?', user.customer_id) : null;
  if (issueCookie) res.cookie('pb_session', sessionId, cookieOpts(rememberMe ? REMEMBER_TTL_MS : undefined));
  res.status(200).json({
    success: true,
    userId: user.id,
    sessionId,
    username: user.username,
    role: user.role,
    customerId: user.customer_id,
    fullName: customer ? `${customer.first_name} ${customer.last_name}` : 'Bank Administrator',
    rememberMe,
    expiresAt,
    message: 'Login successful',
  });
}

export function logout(req: Request, res: Response) {
  const token = readToken(req);
  if (token) run('DELETE FROM sessions WHERE id = ?', token);
  res.clearCookie('pb_session', { path: '/' });
  res.json({ success: true, message: 'You have been logged out successfully' });
}

export function me(req: Request, res: Response) {
  const u = req.user!;
  const customer = u.customerId ? get('SELECT * FROM customers WHERE id = ?', u.customerId) : null;
  const session = get('SELECT * FROM sessions WHERE id = ?', u.sessionId);
  res.json({
    success: true,
    userId: u.userId,
    username: u.username,
    role: u.role,
    customerId: u.customerId,
    fullName: customer ? `${customer.first_name} ${customer.last_name}` : 'Bank Administrator',
    customer: customer ? toCustomer(customer) : null,
    sessionExpiresAt: session?.expires_at,
  });
}

export function forgotPassword(req: Request, res: Response) {
  const identifier = str(req.body?.usernameOrEmail ?? req.body?.username ?? req.body?.email);
  if (!identifier) throw badRequest('IDENTIFIER_REQUIRED', 'Please enter your username or email address.');
  res.json({
    success: true,
    resetRequestId: `RST-${digits(6)}`,
    message: 'If an account matches, password reset instructions have been sent to the registered email address.',
  });
}

export function register(req: Request, res: Response) {
  const b = req.body ?? {};
  const username = str(b.username);
  const password = typeof b.password === 'string' ? b.password : '';
  validate([
    [!str(b.firstName), 'firstName', 'First name is required.'],
    [!str(b.lastName), 'lastName', 'Last name is required.'],
    [!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(b.email)), 'email', 'Please enter a valid email address.'],
    [!/^[a-zA-Z0-9_.]{4,20}$/.test(username), 'username', 'Username must be 4-20 letters, digits, dots or underscores.'],
    [password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password), 'password', 'Password must be at least 8 characters and include an uppercase letter and a digit.'],
    [password !== b.confirmPassword, 'confirmPassword', 'Passwords do not match.'],
    [b.acceptTerms !== true && b.acceptTerms !== 'true', 'acceptTerms', 'You must accept the terms and conditions.'],
  ]);
  if (get('SELECT 1 FROM users WHERE lower(username) = lower(?)', username)) {
    throw conflict('USERNAME_TAKEN', `The username "${username}" is already taken.`);
  }
  const result = tx(() => {
    const customerId = `CUS-${digits(6)}`;
    const userId = `USR-${digits(6)}`;
    const accountNumber = newAccountNumber('CHECKING');
    run('INSERT INTO customers (id, first_name, last_name, email, phone, city, segment, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      customerId, str(b.firstName), str(b.lastName), str(b.email), str(b.phone) || null, str(b.city) || null, 'Retail', 'ACTIVE', nowIso());
    run('INSERT INTO users (id, username, password_hash, role, customer_id, status) VALUES (?,?,?,?,?,?)', userId, username, hashSecret(password), 'CUSTOMER', customerId, 'ACTIVE');
    run('INSERT INTO accounts (id, customer_id, type, nickname, balance, available_balance, credit_limit, status, currency, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      accountNumber, customerId, 'CHECKING', 'Everyday Checking', 1000, 1000, null, 'ACTIVE', 'USD', nowIso());
    run('INSERT INTO transactions (id, account_id, date, description, type, amount, direction, status, balance_after, reference, category) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      newId('TXN'), accountNumber, nowIso(), 'Welcome Bonus Deposit', 'Deposit', 1000, 'CREDIT', 'Completed', 1000, 'WELCOME', 'Income');
    run('INSERT INTO notifications (id, customer_id, type, title, message, is_read, created_at) VALUES (?,?,?,?,?,0,?)',
      newId('NTF'), customerId, 'Promotion', 'Welcome to ParaBank Pro', 'A $1,000.00 welcome bonus was credited to your new checking account.', nowIso());
    return { customerId, userId, accountNumber };
  });
  res.status(201).json({ success: true, ...result, username, message: 'Registration successful. You can now log in.' });
}

/** Lab helper: force the current session to expire so learners can test expired-session handling. */
export function expireSession(req: Request, res: Response) {
  const token = readToken(req);
  if (!token || !get('SELECT 1 FROM sessions WHERE id = ?', token)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No active session to expire.');
  }
  run('UPDATE sessions SET expires_at = ? WHERE id = ?', new Date(Date.now() - 1000).toISOString(), token);
  res.json({ success: true, sessionId: token, message: 'Session expired. The next authenticated request will return 401 SESSION_EXPIRED.' });
}
