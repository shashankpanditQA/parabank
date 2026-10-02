import { defineConfig, devices } from '@playwright/test';

/**
 * ParaBank Pro — Playwright configuration
 *
 * - Local runs start their own server on :4100 with a separate database (data/test.db)
 *   so your practice data on :4000 is never touched.
 * - Point the suite at a running/deployed instance with BASE_URL, e.g.
 *     BASE_URL=https://your-app.onrender.com npx playwright test
 * - The banking data is shared state (balances, beneficiaries), so tests run with one worker.
 */
const PORT = Number(process.env.TEST_PORT ?? 4100);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: Number(process.env.WORKERS ?? 1),
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/fixtures/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    acceptDownloads: true,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'chromium', testMatch: /(ui|hybrid|challenges)\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && node --disable-warning=ExperimentalWarning dist/server.js',
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { PORT: String(PORT), DB_PATH: 'data/test.db', SEED_ON_START: 'true' },
      },
});
