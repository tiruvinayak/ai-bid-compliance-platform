import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const OFFICER_EMAIL = 'officer@demo.gov.in';
const OFFICER_PASSWORD = 'Officer@123';
const BIDDER_EMAIL = 'user@demo.gov.in';
const BIDDER_PASSWORD = 'User@123';

async function login(page, email, password, expectedPath) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="name@organisation.gov.in"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(expectedPath, { timeout: 15000 });
}

test.describe('Phase 4 Multi-Bidder Comparison E2E', () => {

  test('CMP 1: Officer login and navigate Central → Sector → Department → Tender', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');

    await page.goto(`${BASE_URL}/government`);
    await expect(page.locator('text=Loading government hierarchy statistics...')).not.toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Railways")').first().click();
    await page.waitForURL('**/government/sectors/**');
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Railway Procurement Department")').click();
    await page.waitForURL('**/government/departments/**');
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=TND-GEM-2026-1042')).toBeVisible();

    await page.locator('tr:has-text("TND-GEM-2026-1042")').click();
    await page.waitForURL('**/compliance**', { timeout: 10000 });
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 15000 });

    console.log('CMP 1 PASSED: Officer reached tender compliance dashboard via hierarchy');
  });

  test('CMP 2: Compare Bids button opens the comparison screen', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compliance`);
    await expect(page.locator('text=Loading Bid Compliance Evaluation Matrix...')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 10000 });

    const compareButton = page.locator('button:has-text("Compare Bids")');
    await expect(compareButton).toBeVisible();
    await compareButton.click();
    await page.waitForURL('**/compare**', { timeout: 10000 });

    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Multi-Bidder Comparison — TND-GEM-2026-1042')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Comparison Summary')).toBeVisible();

    console.log('CMP 2 PASSED: Compare Bids opens comparison screen');
  });

  test('CMP 3: Multiple bidders displayed with factual counts', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    // All three seeded bidders of TND-GEM-2026-1042 are shown.
    await expect(page.locator('text=ABC Technologies Pvt Ltd').first()).toBeVisible();
    await expect(page.locator('text=Bharat Networks Pvt Ltd').first()).toBeVisible();
    await expect(page.locator('text=Zenith IT Solutions Ltd').first()).toBeVisible();

    // Metric rows are factual counts, not scores or winners.
    await expect(page.locator('td:has-text("Preliminary")').first()).toBeVisible();
    await expect(page.locator('td:has-text("Requirements passed")').first()).toBeVisible();
    await expect(page.locator('td:has-text("Failed")').first()).toBeVisible();
    await expect(page.locator('td:has-text("Missing")').first()).toBeVisible();

    // No artificial winner/score language anywhere on the page.
    await expect(page.locator('text=Winner')).not.toBeVisible();
    await expect(page.locator('text=Recommended Winner')).not.toBeVisible();

    console.log('CMP 3 PASSED: Multiple bidders displayed with factual metrics');
  });

  test('CMP 4: Requirement matrix displays per-bidder statuses', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=Requirement Comparison')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=REQ-001').first()).toBeVisible();
    await expect(page.locator('text=REQ-008').first()).toBeVisible();

    // Actual seeded outcomes appear as status badges in the matrix.
    // REQ-008: ABC MISSING, Bharat MISSING, Zenith PASS.
    const req8Row = page.locator('tr').filter({ hasText: 'REQ-008' }).first();
    await expect(req8Row.locator('text=MISSING').first()).toBeVisible();
    await expect(req8Row.locator('text=PASS').first()).toBeVisible();

    // REQ-003: Bharat FAIL vs others REVIEW.
    const req3Row = page.locator('tr').filter({ hasText: 'REQ-003' }).first();
    await expect(req3Row.locator('text=FAIL').first()).toBeVisible();
    await expect(req3Row.locator('text=REVIEW').first()).toBeVisible();

    console.log('CMP 4 PASSED: Requirement matrix shows per-bidder statuses');
  });

  test('CMP 5: Risk and conflict counts displayed from stored results', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    await expect(page.locator('td:has-text("Risks (H / M / L)")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("Conflicts")').first()).toBeVisible();

    // Seeded facts: Bharat has 2 HIGH risks and 1 conflict; Zenith has 0 conflicts.
    await expect(page.locator('text=Conflict Details')).toBeVisible();
    await expect(page.locator('text=1 conflict').first()).toBeVisible();
    await expect(page.locator('text=2 conflicts').first()).toBeVisible();
    await expect(page.locator('text=No conflicts recorded.').first()).toBeVisible();

    console.log('CMP 5 PASSED: Risk and conflict counts rendered from stored data');
  });

  test('CMP 6: Clicking a matrix cell reveals detail with evidence traceability', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    // REQ-001 row, ABC Technologies column (last of three columns) has seeded evidence.
    const req1Row = page.locator('tr').filter({ has: page.locator('td') }).filter({ hasText: 'REQ-001' }).first();
    const req1Button = req1Row.locator('button[title*="GEM-2026-001"]').first();
    await req1Button.click();

    // Detail panel opens with status/expected/actual/evidence.
    await expect(page.locator('text=Expected value').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Actual value').first()).toBeVisible();
    await expect(page.locator('text=Evidence').first()).toBeVisible();
    await expect(page.locator('text=GST_Certificate_2026.pdf').first()).toBeVisible();

    // Evidence link routes to the existing Evidence Viewer.
    const viewEvidence = page.locator('button:has-text("View Evidence")').first();
    await expect(viewEvidence).toBeVisible();
    await viewEvidence.click();
    await page.waitForURL('**/evidence/**', { timeout: 10000 });
    await expect(page.locator('text=Evidence Inspector').or(page.locator('text=Evidence was not found'))).toBeVisible({ timeout: 15000 });

    console.log('CMP 6 PASSED: Cell detail and evidence traceability work');
  });

  test('CMP 7: View Bid Details navigates to existing compliance dashboard', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text("View Bid Details")').first().click();
    await page.waitForURL('**/compliance**', { timeout: 10000 });
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 15000 });

    console.log('CMP 7 PASSED: Bid detail navigation uses existing compliance page');
  });

  test('CMP 8: Return from bid details back to comparison', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });

    // Round-trip: comparison → bid details → comparison.
    await page.locator('button:has-text("View Bid Details")').first().click();
    await page.waitForURL('**/compliance**', { timeout: 10000 });
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text("Compare Bids")').click();
    await page.waitForURL('**/compare**', { timeout: 10000 });
    await expect(page.locator('text=Comparison Summary')).toBeVisible({ timeout: 15000 });

    console.log('CMP 8 PASSED: Round-trip between comparison and bid details works');
  });

  test('CMP 9: Unauthorized bidder denied by frontend guard and backend API', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');

    // Frontend GovernmentRoute bounces bidders away from the comparison screen.
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await page.waitForURL('**/user/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Bidder Submission Portal')).toBeVisible({ timeout: 10000 });

    // Backend rejects a direct API call with the bidder's token (403).
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();
    const response = await page.request.get(
      `${BASE_URL}/api/tenders/TND-GEM-2026-1042/comparison`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(response.status()).toBe(403);

    console.log('CMP 9 PASSED: Bidder blocked by route guard and backend (403)');
  });

  test('CMP 10: Filters and neutral sorting operate on real data', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compare`);
    await expect(page.locator('text=Loading Multi-Bidder Comparison...')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=ABC Technologies Pvt Ltd').first()).toBeVisible();

    // Filter: has conflicts → Zenith (0 conflicts) is filtered out.
    await page.locator('button:has-text("Has conflicts")').click();
    await expect(page.locator('text=Zenith IT Solutions Ltd').first()).not.toBeVisible();
    await expect(page.locator('text=ABC Technologies Pvt Ltd').first()).toBeVisible();
    await expect(page.locator('text=Bharat Networks Pvt Ltd').first()).toBeVisible();

    // Neutral sort option exists (no Best/Winner labels).
    await expect(page.locator('#cmp-sort')).toBeVisible();
    await page.selectOption('#cmp-sort', 'FAIL');
    await expect(page.locator('text=Winner')).not.toBeVisible();

    // Clear back to all bidders.
    await page.locator('button:has-text("All bidders")').click();
    await expect(page.locator('text=Zenith IT Solutions Ltd').first()).toBeVisible();

    console.log('CMP 10 PASSED: Filters and neutral sorting work on actual data');
  });
});
