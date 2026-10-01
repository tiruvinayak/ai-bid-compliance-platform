import { test, expect, type Page } from '@playwright/test';

/**
 * Fixed SIH demo credentials — real-browser verification (login panel,
 * authentication, role-based dashboard routing) for all four accounts.
 * Run with:
 *   DEMO_BASE_URL=http://localhost npx playwright test --config playwright.demo.config.ts
 *   DEMO_BASE_URL=https://<tunnel> npx playwright test --config playwright.demo.config.ts
 */

type DemoAccount = {
  label: string;
  email: string;
  password: string;
  homePath: string;
  storedRole: string;
};

const ACCOUNTS: DemoAccount[] = [
  {
    label: 'Central Admin',
    email: 'admin@demo.gov.in',
    password: 'Admin@123',
    homePath: '/government',
    storedRole: 'CENTRAL_ADMIN',
  },
  {
    label: 'Sector (Railways)',
    email: 'railways@demo.gov.in',
    password: 'Sector@123',
    homePath: '/government',
    storedRole: 'SECTOR_USER',
  },
  {
    label: 'Officer',
    email: 'officer@demo.gov.in',
    password: 'Officer@123',
    homePath: '/dashboard',
    storedRole: 'GOVERNMENT OFFICER',
  },
  {
    label: 'Bidder',
    email: 'user@demo.gov.in',
    password: 'User@123',
    homePath: '/user/dashboard',
    storedRole: 'USER',
  },
];

interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  authFailures: string[];
}

const monitor = (page: Page): PageProblems => {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], authFailures: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') problems.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => problems.pageErrors.push(String(error)));
  page.on('response', (response) => {
    const status = response.status();
    if (status === 401 || status === 403) {
      problems.authFailures.push(`${status} ${response.request().method()} ${response.url()}`);
    }
  });
  return problems;
};

const expectCleanSession = (problems: PageProblems, where: string) => {
  expect(problems.pageErrors, `uncaught page errors during ${where}`).toEqual([]);
  expect(problems.consoleErrors, `console errors during ${where}`).toEqual([]);
  expect(problems.authFailures, `401/403 responses during ${where}`).toEqual([]);
};

const submitLogin = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
};

test.describe('SIH fixed demo credentials', () => {
  test('login page shows the demo credentials section for all four accounts', async ({ page }) => {
    const problems = monitor(page);
    await page.goto('/login');
    await expect(page.getByText('SIH Demo Accounts (fixed credentials)')).toBeVisible();
    for (const account of ACCOUNTS) {
      await expect(page.getByText(account.email)).toBeVisible();
      await expect(page.getByText(account.password)).toBeVisible();
    }
    expectCleanSession(problems, 'demo panel visibility');
  });

  test('demo account cards prefill the login form', async ({ page }) => {
    await page.goto('/login');
    for (const account of ACCOUNTS) {
      await page.getByRole('button', { name: account.email }).click();
      await expect(page.locator('input[autocomplete="username"]')).toHaveValue(account.email);
      await expect(page.locator('input[autocomplete="current-password"]')).toHaveValue(account.password);
    }
  });

  for (const account of ACCOUNTS) {
    test(`${account.email} signs in and reaches ${account.homePath}`, async ({ page }) => {
      const problems = monitor(page);
      await submitLogin(page, account.email, account.password);

      await page.waitForURL(
        (url) => url.pathname === account.homePath || url.pathname.startsWith(`${account.homePath}/`),
      );
      expect(new URL(page.url()).pathname === account.homePath
        || new URL(page.url()).pathname.startsWith(`${account.homePath}/`),
        `expected to land in ${account.homePath}, got ${page.url()}`).toBe(true);

      const storedRole = await page.evaluate(() => localStorage.getItem('gem_user_role'));
      expect(storedRole).toBe(account.storedRole);

      const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
      expect(token).toBeTruthy();

      expectCleanSession(problems, `${account.email} session`);
    });
  }

  test('wrong password is rejected and stays on the login page', async ({ page }) => {
    const problems = monitor(page);
    await submitLogin(page, 'admin@demo.gov.in', 'Definitely-Wrong-123');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeFalsy();
    // The rejected attempt legitimately produces a 401; nothing else may fail.
    const unexpectedConsoleErrors = problems.consoleErrors.filter((entry) => !entry.includes('401'));
    expect(unexpectedConsoleErrors).toEqual([]);
    const unexpectedAuthFailures = problems.authFailures.filter((entry) =>
      !(entry.startsWith('401') && entry.includes('/api/auth/login')));
    expect(unexpectedAuthFailures).toEqual([]);
  });

  test('demo panel card click performs a real API login (not mock mode)', async ({ page }) => {
    const problems = monitor(page);
    const loginRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/login') && request.method() === 'POST') {
        loginRequests.push(request.url());
      }
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'admin@demo.gov.in' }).click();
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.startsWith('/government'));

    expect(loginRequests.length, 'expected a real POST /api/auth/login').toBeGreaterThan(0);
    const role = await page.evaluate(() => localStorage.getItem('gem_user_role'));
    expect(role).toBe('CENTRAL_ADMIN');
    expectCleanSession(problems, 'card-click login');
  });
});
