import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the fixed SIH demo-credential tests. The target base URL comes
 * from DEMO_BASE_URL so the same spec can run against the local nginx entry
 * (http://localhost) and the public tunnel origin.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /demo-credentials\.spec\.ts/,
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
  timeout: 90000,
});
