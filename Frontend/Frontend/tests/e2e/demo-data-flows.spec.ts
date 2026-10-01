import { test, expect, type Page } from '@playwright/test';

/**
 * Synthetic demo-data end-to-end walkthrough: each role logs in through the
 * real API and exercises the seeded DEMO tenders/bids/documents/evidence.
 * Run with:
 *   DEMO_BASE_URL=http://localhost npx playwright test --config playwright.demo-flows.config.ts
 *   DEMO_BASE_URL=https://<tunnel> npx playwright test --config playwright.demo-flows.config.ts
 */

const pageErrors: string[] = [];
const watchPageErrors = (page: Page, label: string) => {
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${String(error)}`));
};

const submitLogin = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
};

test.afterAll(() => {
  expect(pageErrors, 'uncaught page errors during demo flow walkthrough').toEqual([]);
});

test.describe('SIH synthetic demo data flows', () => {
  test('admin sees both synthetic DEMO tenders and opens the department view', async ({ page }) => {
    watchPageErrors(page, 'admin');
    await submitLogin(page, 'admin@demo.gov.in', 'Admin@123');
    await page.waitForURL(/\/government/);

    await expect(page.getByText('TND-GEM-DEMO-1042').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('TND-RIP-DEMO-2047').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Supply of Railway Track Maintenance Equipment').first())
      .toBeVisible({ timeout: 20000 });

    await page.goto('/government/departments/1');
    await expect(page.getByText('TND-GEM-DEMO-1042').first()).toBeVisible({ timeout: 20000 });
  });

  test('railways sector user sees the synthetic DEMO tenders', async ({ page }) => {
    watchPageErrors(page, 'railways');
    await submitLogin(page, 'railways@demo.gov.in', 'Sector@123');
    await page.waitForURL(/\/government/);

    await expect(page.getByText('TND-GEM-DEMO-1042').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('TND-RIP-DEMO-2047').first()).toBeVisible({ timeout: 20000 });
  });

  test('officer walks dashboard, compliance, evidence, comparison and review',
    async ({ page }) => {
      watchPageErrors(page, 'officer');
      await submitLogin(page, 'officer@demo.gov.in', 'Officer@123');
      await page.waitForURL(/\/dashboard/);

      await expect(page.getByText(/DEMO-BID-/).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/PENDING OFFICER REVIEWS/i).first()).toBeVisible({ timeout: 20000 });

      await page.goto('/bids/DEMO-BID-001/compliance');
      await expect(page.getByText('Acme Infra Pvt Ltd').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/83\.3/).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('REQ-DEMO-001').first()).toBeVisible({ timeout: 20000 });

      await page.goto('/bids/DEMO-BID-001/evidence/REQ-DEMO-001');
      await expect(page.getByText('DEMO_EXPERIENCE_ACME.pdf').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/7 years/).first()).toBeVisible({ timeout: 20000 });

      await page.goto('/bids/DEMO-BID-001/compare');
      await expect(page.getByText('Bharat Rail Systems Pvt Ltd').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Nova Engineering Solutions').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('DEMO-BID-003').first()).toBeVisible({ timeout: 20000 });

      await page.goto('/bids/DEMO-BID-002/review');
      await expect(page.getByText('Bharat Rail Systems Pvt Ltd').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('TND-GEM-DEMO-1042').first()).toBeVisible({ timeout: 20000 });
    });

  test('bidder walks own DEMO bid and owned synthetic documents', async ({ page }) => {
    watchPageErrors(page, 'bidder');
    await submitLogin(page, 'user@demo.gov.in', 'User@123');
    await page.waitForURL(/\/user\/dashboard/);

    await expect(page.getByText('Supply of Railway Track Maintenance Equipment').first())
      .toBeVisible({ timeout: 20000 });
    await expect(page.getByText('DEMO-BID-001').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/83\.3/).first()).toBeVisible({ timeout: 20000 });

    await page.goto('/user/uploads');
    await expect(page.getByText('DEMO_EXPERIENCE_ACME.pdf').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('DEMO_DECLARATION_ACME.pdf').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('DEMO_ELIGIBILITY_ACME.pdf').first()).toBeVisible({ timeout: 20000 });

    const rfpCount = await page.getByText('DEMO_TENDER_RAIL_1042.pdf').count();
    expect(rfpCount, 'officer-uploaded tender RFP must not appear in bidder uploads').toBe(0);
  });
});
