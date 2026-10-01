import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the synthetic demo-data walkthrough tests (§29 demo flow):
 * officer, admin, sector and bidder roles exercised in a real browser
 * against the seeded DEMO tenders/bids. Target base URL from DEMO_BASE_URL.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /demo-data-flows\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.DEMO_BASE_URL || 'http://localhost',
    trace: 'on-first-retry',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 120000,
});
