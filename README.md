# ParaBank Pro

> **A Realistic Banking Application Built for Playwright Automation Practice**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/shashankpanditQA/parabank)

ParaBank Pro is a full-stack banking app (React + Express + SQLite) designed for learning Playwright from beginner to expert. Everything is real: real `<iframe>`s, real `alert()` / `confirm()` / `prompt()` / `beforeunload` dialogs, real `window.open()` popups, a real REST API with dynamic JSON, and a real database — plus **105 challenges** with hints and executable solutions.

```
              PARA BANK PRO
        PLAYWRIGHT AUTOMATION LAB
   Banking App → Automation Lab → 105 Challenges
   UI Testing · API Testing · Browser Testing
```

---

## Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [API Documentation](#api-documentation)
8. [Running the Application](#running-the-application)
9. [Running Tests](#running-tests)
10. [Playwright Setup](#playwright-setup)
11. [Challenge Guide](#challenge-guide)
12. [iFrame Guide](#iframe-guide)
13. [Dialog Guide](#dialog-guide)
14. [Popup Guide](#popup-guide)
15. [API Testing Guide](#api-testing-guide)
16. [Network Interception Guide](#network-interception-guide)
17. [Deployment (free hosting)](#deployment-free-hosting)
18. [Troubleshooting](#troubleshooting)

---

## Project Overview

| Area | What you get |
| --- | --- |
| **Banking** | Login / logout / register / forgot password, dashboard, checking · savings · credit accounts, 128+ transactions per demo user, transfers with OTP, bill payments, loans, cards (freeze, PIN, limits, report lost), beneficiaries, notifications, support tickets with attachments |
| **Admin portal** | Customers (search, filter, sort, paginate, enable/disable), all transactions, loan approvals (confirm + prompt dialogs), support ticket queue |
| **Automation Lab** | Locators, Forms, Tables (nested Customer → Account → Transactions), Pagination, iFrames (by test id, name, URL, nested OTP, 2-level), Alerts & Dialogs, Popups & Windows, Multiple Tabs, API Responses debug panel, Network Interception with server-side **Failure Injection** and **Network Delay**, File Upload, File Download, Advanced Workflows |
| **Challenges** | 25 Beginner · 30 Intermediate · 30 Advanced · 20 Expert = **105**, each with objective, skills, expected result, 3 progressive hints and a complete `test(...)` solution with explanations |
| **Tests** | API, UI and hybrid suites + all 105 challenge solutions generated as runnable specs (`tests/challenges`) |

### Demo credentials

| Role | Username | Password |
| --- | --- | --- |
| Customer (main practice user) | `john` | `Demo@123` |
| Second customer | `sarah` | `Demo@123` |
| Admin | `admin` | `Admin@123` |
| Locked user | `locked` | `Demo@123` |
| Disabled user | `disabled` | `Demo@123` |

- **OTP** for transfers and card payments: `123456`
- **Test cards**: `4111 1111 1111 1111` (success), `4000 0000 0000 0002` (declined, 402), `4000 0000 0000 0119` (gateway timeout, 504)
- Card payments **≤ $100** skip the OTP step.

All data is fictional. No real money, no real credentials.

---

## Architecture

```text
parabank-pro/
├── frontend/                 React 19 + TypeScript + Vite + Tailwind 4
│   ├── components/           UI kit, ApiResponsePanel, Sidebar, Header
│   ├── pages/                Banking pages, admin/, lab/
│   ├── layouts/              App + auth layouts, role guard
│   ├── hooks/                useAuth, useApi, useToast, useChallenges, useBeforeUnload
│   ├── services/api.ts       fetch() client that records every call for the debug panel
│   ├── utils/                Formatting helpers
│   └── routes/router.tsx     createBrowserRouter (data router → useBlocker)
├── backend/                  Express 5 + TypeScript
│   ├── controllers/          auth, banking, products, service, admin, lab
│   ├── routes/               REST routes + API catalog (/api/docs)
│   ├── services/banking.ts   Ledger, transfers, payments (business rules)
│   ├── models/mappers.ts     DB row → camelCase JSON
│   ├── middleware/           auth (cookie/Bearer, roles), simulation (failure/delay), errors
│   ├── database/             node:sqlite connection + schema, reset CLI
│   ├── utils/                IDs, HTTP errors/pagination, PDF/CSV writers
│   └── public/               Real HTML pages for iframes & popups
│       ├── gateway/          /payment-gateway, /payment-gateway/otp, /payment-gateway/checkout
│       ├── popups/           statement, policy, secure-login, transaction, support
│       └── lab-pages/        secure-card, transfer-widget, outer/inner frame
├── seed/seed.ts              Deterministic (reset) and random (generate) datasets
├── challenges/               beginner/ intermediate/ advanced/ expert/ (105 challenges)
├── tests/
│   ├── api/                  REST API tests (no browser)
│   ├── ui/                   UI tests
│   ├── hybrid/               UI + API + DB tests
│   ├── challenges/           Generated from challenge solutions (npm run challenges:generate)
│   └── fixtures/             auth fixture (logged-in page, adminPage), global setup
├── sample-files/             Files for upload practice
├── scripts/                  generate-challenge-tests.ts
├── playwright.config.ts
├── render.yaml · Dockerfile  Deployment
└── README.md
```

**One process, one port.** In production Express serves the built React app, the REST API, the iframe/popup HTML pages and the database. In development Vite (`:5173`) proxies `/api`, `/payment-gateway`, `/popups` and `/lab-pages` to Express (`:4000`), so everything is same-origin either way — cookies, iframes and `postMessage` behave exactly as in production.

```text
UI action → fetch() → Express route → controller → service → SQLite
                                        ↓
           JSON (dynamic IDs) ← mapper ←┘   →  UI update + API Response Viewer
```

---

## Technology Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript (tsx in dev, esbuild bundle in prod), multer, cookie-parser |
| Database | SQLite via Node's built-in `node:sqlite` (no native build step) |
| Testing | Playwright Test (API, UI, hybrid, 105 challenge specs) |

---

## Installation

Requirements: **Node.js 22.13+** (for the built-in `node:sqlite` module) and npm.

```bash
git clone <your-repo-url> parabank-pro
cd parabank-pro
npm install
npx playwright install chromium   # browsers for the test suite
```

---

## Environment Variables

All are optional. Copy `.env.example` to `.env` (loaded by `npm run start`) or export them in your shell.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port |
| `DB_PATH` | `./data/parabank.db` | SQLite file (created automatically) |
| `SEED_ON_START` | `false` | Re-seed the canonical data on every start |
| `NODE_ENV` | — | `production` enables `Secure` cookies |
| `INSECURE_COOKIES` | `false` | Allow non-Secure cookies in production (plain HTTP hosting) |
| `API_URL` | `http://localhost:4000` | Dev only — where Vite proxies API calls |
| `BASE_URL` | — | Playwright: test an already running / deployed instance |
| `TEST_PORT` | `4100` | Playwright: port of the server it starts |
| `WORKERS` | `1` | Playwright workers (shared banking data → 1 is safest) |
| `SKIP_RESET` | `false` | Playwright: skip the global data reset |
| `CHROMIUM_PATH` | — | Playwright: custom Chromium executable |

---

## Database

- SQLite file at `data/parabank.db`, created and **seeded automatically on first start**.
- Tables: `customers, users, sessions, accounts, transactions, transfers, beneficiaries, payments, loans, cards, notifications, tickets, documents, meta`.
- Seed (canonical): 12 customers (10 active + locked + disabled), 25+ accounts, 280+ transactions (128 for john), 26 beneficiaries, 16 payments, 10 loans, 11 support tickets, 30 notifications, 15 cards, 1 admin.
- Stable anchors for challenges: john = `USR-102938` / `CUS-100001`, accounts `CHK-102938`, `SAV-827364`, `CRD-554120`, an *Amazon Marketplace Order* of **$249.99**, credit card ending **8273**.
- New records always get dynamic IDs: `TXN-######`, `TRF-######`, `PAY-######`, `LOAN-######`, `TKT-######`, `BEN-######`, `DOC-######`.

Reset options:

| How | Effect |
| --- | --- |
| Automation Lab → **Reset Practice Data** / `POST /api/lab/reset` | Restore the canonical dataset |
| Automation Lab → **Generate New Test Data** / `POST /api/lab/generate` | Brand new random dataset (logins unchanged) |
| `npm run seed` / `npm run seed -- --random` | Same, from the CLI |
| Delete `data/` | Fresh database on next start |

Read-only inspector for consistency checks: `GET /api/lab/db/:table?id=…` (customers see their own rows, admins see everything; secrets are never exposed).

---

## API Documentation

The full, interactive catalog lives in the app at **/api-docs** (raw JSON: `GET /api/docs`). Highlights:

| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` · `/logout` · `/register` · `/forgot-password` | Cookie `pb_session` **and** `sessionId` (use as `Authorization: Bearer …`) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard` | Balances, recent activity, pending items |
| GET/POST | `/api/accounts`, `GET /api/accounts/:id` | Open accounts with optional funding |
| POST | `/api/deposits`, `/api/withdrawals` | Quick actions |
| GET | `/api/transactions`, `/api/transactions/:id` | `search, status, type, accountId, fromDate, toDate, minAmount, maxAmount, sortBy, order, page, pageSize` |
| GET/POST | `/api/transfers` | OTP, duplicate detection (60 s), insufficient balance, scheduled transfers |
| GET/POST | `/api/payments`, `GET /api/payments/billers` | Bill pay (`channel: WEB`) or card gateway (`channel: GATEWAY`) |
| GET/POST | `/api/loans`, `GET /api/loans/:id` | Auto-reject when debt-to-income > 50 % |
| GET/POST | `/api/cards`, `PATCH /api/cards/:id/{freeze,unfreeze,pin,limit}`, `POST /api/cards/:id/report-lost` | |
| GET/POST/PUT/DELETE | `/api/beneficiaries[/:id]` | 409 on duplicates |
| GET/PATCH/DELETE | `/api/notifications[...]` | read / unread / read-all / delete, filters |
| GET/POST | `/api/support/tickets` | JSON or multipart with `attachment` |
| GET/POST/DELETE | `/api/documents` | Multipart upload (`file`, `category`) |
| GET | `/api/downloads/statement`, `/transactions-report`, `/loan-agreement/:id` | `Content-Disposition: attachment` |
| * | `/api/admin/...` | Admin only (403 for customers) |
| * | `/api/lab/...` | reset, generate, simulation, echo, slow, fx-rates, directory, db inspector |

Error format (every endpoint):

```json
{ "success": false, "errorCode": "INSUFFICIENT_BALANCE", "message": "Insufficient account balance", "availableBalance": 1234.56 }
```

Every API response carries `X-Request-Id`, `X-Response-Time` and `Cache-Control: no-store`.

---

## Running the Application

```bash
npm run dev       # API on :4000 (tsx watch) + Vite on :5173 → open http://localhost:5173
npm run build     # Vite build → dist/public, esbuild bundle → dist/server.js
npm run start     # Production server → http://localhost:4000
```

---

## Running Tests

```bash
npm run test               # everything (API + UI + hybrid + 105 challenges), headless
npm run test:ui            # Playwright UI mode
npm run test:headed        # watch the browser
npm run test:api           # API project only (no browser)
npm run test:challenges    # only the 105 challenge solutions
npm run challenges:generate  # regenerate tests/challenges from challenges/*/index.ts
npx playwright show-report
```

The config builds the app and starts its **own server on :4100 with a separate database** (`data/test.db`), then resets it to the canonical seed in `globalSetup` — your practice data on :4000 is untouched.

Run against a deployed instance:

```bash
BASE_URL=https://your-app.onrender.com npx playwright test
```

---

## Playwright Setup

`tests/fixtures/auth.ts` provides:

```ts
import { test, expect } from '../fixtures/auth';

test('my test', async ({ page, adminPage }) => {
  // `page` is already logged in as john (via API — fast)
  // `adminPage` is a separate context logged in as admin
});
```

plus helpers `loginViaApi(page, 'sarah')`, `loginViaUi(page)` and `randomAmount()`.

Banking data is shared state (balances, beneficiaries), so the suite uses **1 worker** by default. Use unique data (`Date.now()`) and random amounts to avoid `DUPLICATE_TRANSFER`.

Locator strategy, in order of preference: `getByRole` → `getByLabel` → `getByPlaceholder` / `getByText` → `getByTestId`. Test ids exist only where there is no good user-facing hook (e.g. `transaction-row`, `api-response`, `success-toast`, `payment-frame`, `otp-frame`).

---

## Challenge Guide

Open **Challenges** in the sidebar. Each challenge page has a **Practice Console** (difficulty, skills, progressive hints), **Open Practice Page**, **Show Solution** (complete `test(...)` + *why this approach*) and **Mark as Complete**. Progress is stored in `localStorage` (`parabank.challenges.completed`) and shown on the **Automation Lab** dashboard.

| Level | IDs | Topics |
| --- | --- | --- |
| Beginner | 1–25 | Login variants, logout, remember me, links, labels, dropdowns, radios, checkboxes, placeholders, URL & text assertions, roles |
| Intermediate | 26–55 | Search, filter, sort, paginate, nested tables, `filter()/has/nth()`, modals, toasts, confirm/prompt/alert, iframes, upload, download |
| Advanced | 56–85 | Nested iframes, frames by name/URL, popups, multiple windows & tabs, storageState, cookies, localStorage, session expiry, `waitForResponse`, `page.route` (continue, fulfill, abort, delay, modify, fetch+patch), headers, dynamic data |
| Expert | 86–105 | UI + API + DB, balance consistency, popup + iframe + OTP, popup + API, dialog + API, multiple users, roles, parallel workflows, network/server failures, invalid JSON, mid-flow session expiry, beforeunload, scheduled transfers, and **#105 Secure Banking Payment** |

**Challenge #105** — Login → Dashboard → Transfer Money → Open Secure Payment Gateway → popup → payment iframe → card details → nested OTP iframe → submit → `confirm()` → `POST /api/payments` → JSON → database → transaction table → success toast.

---

## iFrame Guide

Lab page: **/lab/iframes**

```ts
// By test id
const frame = page.frameLocator('[data-testid="payment-frame"]');
await frame.getByLabel('Card Number').fill('4111111111111111');

// By name (Frame object). page.frame() does not wait → poll first.
await expect.poll(() => page.frame({ name: 'bank-payment-frame' })).not.toBeNull();
const named = page.frame({ name: 'bank-payment-frame' })!;

// By URL
const byUrl = page.frame({ url: /\/payment-gateway\?mode=simple/ });

// Nested: payment iframe → OTP iframe
const pay = page.frameLocator('[data-testid="nested-payment-frame"]');
const otp = pay.frameLocator('[data-testid="otp-frame"]');
await otp.getByLabel('Enter OTP').fill('123456');
```

Newer Playwright also offers `page.getByTestId('payment-frame').contentFrame()`.

---

## Dialog Guide

Lab page: **/lab/dialogs**. Real `alert`, `confirm`, `prompt` and `beforeunload`. Beneficiary deletion and admin loan decisions use real dialogs too.

```ts
page.once('dialog', async (dialog) => {
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toContain('Are you sure you want to delete this beneficiary?');
  await dialog.accept();          // or dialog.dismiss()
});
await row.getByRole('button', { name: 'Delete' }).click();

// prompt
page.once('dialog', (d) => d.accept('PAYMENT-12345'));
// keep the default value (accept() alone submits an empty string!)
page.once('dialog', (d) => d.accept(d.defaultValue()));

// beforeunload (unsaved transfer)
const dialogPromise = page.waitForEvent('dialog');
await page.close({ runBeforeUnload: true });
const d = await dialogPromise;           // d.type() === 'beforeunload'
await d.dismiss();                        // stay on the page
```

Register the handler **before** the action — Playwright auto-dismisses unhandled dialogs.

---

## Popup Guide

Lab page: **/lab/popups**, **/lab/tabs**, **/lab/workflows**

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Open Account Statement' }).click();
const popup = await popupPromise;
await popup.waitForLoadState();
await expect(popup.getByRole('heading', { name: 'Account Statement' })).toBeVisible();

// Several windows at once
const popups: Page[] = [];
page.on('popup', (p) => popups.push(p));
await page.getByRole('button', { name: 'Open All Windows' }).click();
await expect.poll(() => popups.length).toBe(3);

// Tabs (target="_blank")
const tabPromise = context.waitForEvent('page');
await page.getByRole('link', { name: 'Open Transactions' }).click();
const tab = await tabPromise;
await tab.bringToFront();
```

Popups share cookies with the opener. The **Secure Banking Portal** popup logs in with its own Bearer token so it never hijacks the main session. Dialogs and network requests raised inside a popup (or its iframes) belong to the **popup** page.

---

## API Testing Guide

```ts
// From the UI
const responsePromise = page.waitForResponse((r) =>
  r.url().includes('/api/transfers') && r.request().method() === 'POST');
await page.getByRole('button', { name: 'Confirm Transfer' }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
const body = await response.json();
expect(body.transactionId).toMatch(/^TXN-\d{6}$/);

// Pure API (no browser)
test('accounts', async ({ request }) => {
  const login = await request.post('/api/auth/login', { data: { username: 'john', password: 'Demo@123' } });
  const { sessionId } = await login.json();
  const res = await request.get('/api/accounts', { headers: { Authorization: `Bearer ${sessionId}` } });
  expect(res.ok()).toBeTruthy();
});

// Database consistency
const db = await (await page.request.get(`/api/lab/db/transfers?id=${body.transferId}`)).json();
expect(db.rows[0]).toMatchObject({ status: 'COMPLETED', amount: body.amount });
```

`page.request` shares cookies with the page, so it is ideal for setup and verification steps. The **API Response Viewer** (shown after every important action) and **/lab/api** show exactly what your test will receive.

---

## Network Interception Guide

Lab page: **/lab/network**

```ts
await page.route('**/api/accounts', (route) => route.continue());                 // observe
await page.route('**/api/accounts', (route) => route.fulfill({ json: mock }));    // mock
await page.route('**/api/lab/fx-rates', (route) => route.abort());                // block
await page.route('**/api/lab/echo', (route) =>                                    // modify body
  route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), amount: 999 }) }));
await page.route('**/api/accounts', async (route) => {                            // patch real response
  const response = await route.fetch();
  const json = await response.json();
  json.data[0].currentBalance = 123456.78;
  await route.fulfill({ response, json });
});
```

Server-side simulation (great for realistic error handling):

| Mechanism | Example |
| --- | --- |
| Lab UI → **Failure Injection** | 500 / 401 / 403 / 404 / 408 / 429 / network failure / slow / invalid JSON on any endpoint, optional "next N requests" |
| Lab UI → **Network Delay** | 100 ms · 500 ms · 1 s · 3 s · 5 s per endpoint |
| Request header | `x-simulate-failure: 500` · `x-simulate-delay: 3000` |
| Query string | `?__fail=429&__delay=1000` |

Lab settings are stored per browser (cookie `pb_lab`), so learners don't affect each other on a shared deployment.

---

## Deployment (free hosting)

The app is a single Node service with a file-based database — any Node host works.

### Render (free tier) — recommended

1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` configures everything (build `npm ci --include=dev && npm run build`, start `npm run start`, health check `/api/health`, Node 22).
3. Open the `*.onrender.com` URL and log in as `john / Demo@123`.

Or use the button (replace the repo URL):

```md
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/shashankpanditQA/parabank)
```

Free-tier notes: the service sleeps after ~15 minutes idle (first request takes ~30–60 s) and the disk is ephemeral — the database is re-seeded automatically after a restart or redeploy, which is perfect for a practice lab.

### Docker (Railway, Fly.io, Koyeb, Cloud Run, VPS)

```bash
docker build -t parabank-pro .
docker run -p 4000:4000 -v parabank-data:/app/data parabank-pro
```

Point Playwright at any deployment with `BASE_URL=https://… npx playwright test`.

> On a shared public instance everyone uses the same demo users. **Reset Practice Data** restores the seed for everyone.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `No such built-in module: node:sqlite` | Use Node.js **22.13+** (`nvm use 22`). |
| `ExperimentalWarning: SQLite is an experimental feature` | Harmless. `npm run start` hides it. |
| Port 4000 / 4100 in use | `PORT=4010 npm run start`, `TEST_PORT=4110 npm test`. |
| Browser not installed | `npx playwright install chromium` |
| Tests fail with `DUPLICATE_TRANSFER` | Same amount and route within 60 s — use random amounts. |
| Login tests fail with `ACCOUNT_DISABLED` | Someone disabled a user in the admin portal → **Reset Practice Data**. |
| Seed-based assertions fail (e.g. 3 accounts) | You opened extra accounts → **Reset Practice Data** (the test suite resets automatically). |
| `page.frame()` returns `null` | The SPA renders iframes after load — `await expect.poll(() => page.frame({...})).not.toBeNull()` |
| Dialog test hangs | Register `page.on/once('dialog')` before the click. |
| `beforeunload` dialog never appears | Chrome requires a user gesture first — click/type into the form, then use `page.close({ runBeforeUnload: true })`. |
| Popup dialog not caught | Dialogs inside a popup are emitted on the **popup** page. |
| Cookies not set after deploy on plain HTTP | Set `INSECURE_COOKIES=true` (production cookies are `Secure`). |
| Render first load is slow | Free instances sleep when idle; the first request wakes them. |

---

Built as an original practice application inspired by the idea of demo banking sites. All names, accounts and transactions are fictional.
