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

test.describe('Phase 5 External Verification + ML Risk E2E', () => {

  test('GV 1: Officer sees Government Verification panel with five providers', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compliance`);
    await expect(page.locator('text=Loading Bid Compliance Evaluation Matrix...')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('text=Government Verification').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="gov-row-GST"]')).toBeVisible();
    await expect(page.locator('[data-testid="gov-row-PAN"]')).toBeVisible();
    await expect(page.locator('[data-testid="gov-row-MCA"]')).toBeVisible();
    await expect(page.locator('[data-testid="gov-row-EPFO_ESIC"]')).toBeVisible();
    await expect(page.locator('[data-testid="gov-row-DIGILOCKER"]')).toBeVisible();
    await expect(page.locator('button:has-text("Run Verification")')).toBeVisible();

    console.log('GV 1 PASSED: Government Verification panel shows all five providers');
  });

  test('GV 2: Run Verification reports UNAVAILABLE — never a fake success status', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compliance`);
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 15000 });

    const panel = page.locator('[data-testid="gov-row-GST"]').locator('xpath=ancestor::div[contains(@class,"rounded-xl")]');
    await page.locator('button:has-text("Run Verification")').click();

    // All five rows settle on UNAVAILABLE (no credentials configured).
    for (const provider of ['GST', 'PAN', 'MCA', 'EPFO_ESIC', 'DIGILOCKER']) {
      const row = page.locator(`[data-testid="gov-row-${provider}"]`);
      await expect(row).toContainText('UNAVAILABLE', { timeout: 15000 });
      await expect(row).not.toContainText('VERIFIED');
      await expect(row).not.toContainText('SANDBOX');
    }
    // Explicit explanation is visible.
    await expect(page.locator('text=Official verification provider credentials/API access are not configured').first()).toBeVisible();
    // No success status anywhere inside the panel.
    await expect(panel.getByText('VERIFIED', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('MISMATCH', { exact: true })).toHaveCount(0);

    console.log('GV 2 PASSED: Unconfigured providers report UNAVAILABLE with no fake success');
  });

  test('GV 3: Bidder blocked by route guard and backend API (403)', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');

    // Frontend GovernmentRoute bounces bidders away from the compliance page.
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/compliance`);
    await page.waitForURL('**/user/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Bidder Submission Portal')).toBeVisible({ timeout: 10000 });

    // Direct API calls with the bidder token are rejected with 403.
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();

    const postResponse = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-001/government-verification`,
      { headers: { Authorization: `Bearer ${token}` }, data: { providers: ['GST'] } }
    );
    expect(postResponse.status()).toBe(403);

    const getResponse = await page.request.get(
      `${BASE_URL}/api/bids/GEM-2026-001/government-verification`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(getResponse.status()).toBe(403);

    const mlResponse = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-001/ml-risk`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(mlResponse.status()).toBe(403);

    console.log('GV 3 PASSED: Bidder blocked by route guard and backend (403) on verification + ML');
  });

  test('GV 4: Officer API run + retrieval: UNAVAILABLE results persisted and audited', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();

    // Run all providers.
    const run = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-001/government-verification`,
      { headers: { Authorization: `Bearer ${token}` }, data: {} }
    );
    expect(run.status()).toBe(200);
    const body = await run.json();
    expect(body.bidId).toBe('GEM-2026-001');
    expect(body.results).toHaveLength(5);
    for (const r of body.results) {
      expect(r.status).toBe('UNAVAILABLE');
      expect(r.status).not.toBe('VERIFIED');
      expect(r.message).toContain('not configured');
    }
    // GST reference is masked — raw GSTIN never returned.
    const gst = body.results.find((r) => r.provider === 'GST');
    expect(gst.referenceValue).toBeTruthy();
    expect(gst.referenceValue).not.toContain('AABCT1234');

    // Previous results retrievable via GET (latest per provider).
    const get = await page.request.get(
      `${BASE_URL}/api/bids/GEM-2026-001/government-verification`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(get.status()).toBe(200);
    const stored = await get.json();
    expect(stored.results).toHaveLength(5);
    expect(stored.results.every((r) => r.status === 'UNAVAILABLE')).toBe(true);

    // Unknown provider → 400.
    const bad = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-001/government-verification`,
      { headers: { Authorization: `Bearer ${token}` }, data: { providers: ['INCOME_TAX'] } }
    );
    expect(bad.status()).toBe(400);

    console.log('GV 4 PASSED: Officer run/retrieve works, masked, unknown provider rejected');
  });

  test('GV 5: Risk page keeps rule-based engine and shows ML NOT_AVAILABLE with real features', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/bids/GEM-2026-001/risks`);
    await expect(page.locator('text=Computing Multi-Vector Risk Exposure Score...')).not.toBeVisible({ timeout: 15000 });

    // Existing deterministic risk UI is intact.
    await expect(page.locator('text=WHY IS THIS BID RISKY?').or(page.locator('text=No risks detected'))).toBeVisible({ timeout: 10000 });

    // ML panel present, clearly separate, NOT_AVAILABLE (no trained model).
    const mlPanel = page.locator('[data-testid="ml-risk-panel"]');
    await expect(mlPanel).toBeVisible({ timeout: 15000 });
    await expect(mlPanel.locator('text=ML Risk Assessment')).toBeVisible();
    await expect(mlPanel.locator('text=NOT_AVAILABLE').first()).toBeVisible();
    await expect(mlPanel.locator('text=No validated trained model available').first()).toBeVisible();
    await expect(mlPanel.locator('text=Existing Rule-Based Risk')).toBeVisible();
    await expect(mlPanel.locator('text=MODEL STATUS: NOT TRAINED')).toBeVisible();

    // Real computed features are shown (GEM-2026-001 has seeded analysis data).
    await expect(mlPanel.locator('text=Requirements passed').first()).toBeVisible();
    await expect(mlPanel.locator('text=Conflicts detected').first()).toBeVisible();

    // No fabricated probability when the model is absent.
    await expect(mlPanel).not.toContainText('prediction 0.');
    // No ranking / winner language.
    await expect(mlPanel).not.toContainText('Winner');
    await expect(mlPanel).not.toContainText('Reject this bidder');

    console.log('GV 5 PASSED: Rule-based risk intact; ML shows NOT_AVAILABLE with real features');
  });

  test('GV 6: Officer ML-risk API returns NOT_AVAILABLE without fabricated probability', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();

    const response = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-001/ml-risk`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.status).toBe('NOT_AVAILABLE');
    expect(body.reason).toBe('No validated trained model available');
    expect(body.prediction).toBeNull();
    expect(body.riskLevel).toBeNull();
    expect(body.modelVersion).toBeNull();
    expect(body.featureVersion).toBe('v1');
    expect(body.features.requirementsPassed).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.contributingFeatures)).toBe(true);
    expect(body.contributingFeatures).toHaveLength(0);

    console.log('GV 6 PASSED: ML API returns NOT_AVAILABLE with features and no fake prediction');
  });

  test('GV 7: Unknown bid returns 404; wrong-department scope denied by shared hierarchy gate', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();

    // Non-existent bid → 404 with clear message, no provider run.
    const missing = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-404/government-verification`,
      { headers: { Authorization: `Bearer ${token}` }, data: {} }
    );
    expect(missing.status()).toBe(404);
    const body = await missing.json();
    expect(body.message || body.error).toContain('not found');

    // Same unknown-bid contract on the ML endpoint.
    const missingMl = await page.request.post(
      `${BASE_URL}/api/bids/GEM-2026-404/ml-risk`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(missingMl.status()).toBe(404);

    // Wrong-department/wrong-sector: the Phase 5 services call the same
    // HierarchyService.requireAccessibleTender gate as the comparison API.
    // Officer (RPD/Railways) on a Finance-sector tender → 403 on that gate.
    const foreignTender = await page.request.get(
      `${BASE_URL}/api/tenders/TND-FIN-2026-3101/comparison`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(foreignTender.status()).toBe(403);

    console.log('GV 7 PASSED: Unknown bid 404; shared hierarchy gate denies wrong-department access (403)');
  });
});
