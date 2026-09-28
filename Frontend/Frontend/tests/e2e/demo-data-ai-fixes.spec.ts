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

test.describe('Demo Data + AI Assistant Fix E2E', () => {

  test('DEMO 1: My Uploads shows full 27-document demo set across three bids', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');
    await page.goto(`${BASE_URL}/user/uploads`);
    await expect(page.locator('h4', { hasText: 'Work_Orders.pdf' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("ALL (27)")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Showing 27 of 27 Files')).toBeVisible({ timeout: 10000 });

    console.log('DEMO 1 PASSED: 27 demo documents visible');
  });

  test('DEMO 2: Distinct bid-specific files (Work_Orders, BOQ, Bank, Turnover) searchable', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');
    await page.goto(`${BASE_URL}/user/uploads`);
    await expect(page.locator('h4', { hasText: 'Work_Orders.pdf' })).toBeVisible({ timeout: 15000 });

    const search = page.locator('input[placeholder="Search by filename, document category..."]');

    await search.fill('Work_Orders');
    await expect(page.locator('h4:has-text("Work_Orders.pdf")')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('text=Showing 3 of 27 Files')).toBeVisible();

    await search.fill('_ZI');
    await expect(page.locator('h4', { hasText: 'BOQ_Price_Schedule_ZI.pdf' })).toBeVisible();
    await expect(page.locator('h4', { hasText: 'Bank_Statement_ZI.pdf' })).toBeVisible();
    await expect(page.locator('h4', { hasText: 'Integrity_Pact_ZI.pdf' })).toBeVisible();
    await expect(page.locator('text=Showing 9 of 27 Files')).toBeVisible();

    await search.fill('Turnover_Declaration_ABC');
    await expect(page.locator('h4', { hasText: 'Turnover_Declaration_ABC.pdf' })).toBeVisible();
    await expect(page.locator('text=Showing 1 of 27 Files')).toBeVisible();

    console.log('DEMO 2 PASSED: Distinct seed documents per bid are searchable');
  });

  test('DEMO 3: Seeded document detail modal downloads a real PDF (HTTP 200)', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');
    await page.goto(`${BASE_URL}/user/uploads`);
    const card = page.locator('h4', { hasText: 'Work_Orders.pdf' }).first().locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await card.locator('button:has-text("Details")').click();

    await expect(page.locator('h4.font-mono:has-text("Work_Orders.pdf")')).toBeVisible({ timeout: 5000 });
    const downloadBtn = page.locator('button:has-text("Download")');
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });

    const downloadPromise = page.waitForResponse(
      (res) => res.url().includes('/api/documents/') && res.url().includes('/download'),
      { timeout: 30000 }
    );
    await downloadBtn.click();
    const downloadResponse = await downloadPromise;
    expect(downloadResponse.status()).toBe(200);
    const body = await downloadResponse.body();
    expect(body.length).toBeGreaterThan(1000);
    expect(body.subarray(0, 4).toString('latin1')).toContain('%PDF');

    console.log('DEMO 3 PASSED: Download returned', body.length, 'bytes of PDF');
  });

  test('GOV 1: Eligibility sample query returns grounded guideline answer with citation', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/government-instructions`);
    await expect(page.locator('text=GOVERNMENT AI KNOWLEDGE & RAG ASSISTANT')).toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text(\'"Bidder eligibility requirements"\')').click();

    await expect(page.locator('text=Grounding Status: GROUNDED')).toBeVisible({ timeout: 150000 });
    await expect(page.locator('text=AI System Answer:')).toBeVisible();
    const answer = await page.locator('p.bg-slate-900\\/80').first().textContent().catch(() => '');
    expect((answer || '').length).toBeGreaterThan(20);
    await expect(page.locator('text=Grounded Official Evidence Citations:')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=procurement_guidelines.pdf').first()).toBeVisible();
    await expect(page.locator('text=Page 2').first()).toBeVisible();

    console.log('GOV 1 PASSED: Grounded guideline answer with document citation');
  });

  test('GOV 2: Unrelated cricket query is refused without fabricated answer or citations', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/government-instructions`);
    await expect(page.locator('text=GOVERNMENT AI KNOWLEDGE & RAG ASSISTANT')).toBeVisible({ timeout: 15000 });

    await page.locator('button:has-text(\'"Who won the cricket match?"\')').click();

    await expect(page.locator('text=INSUFFICIENT_GOVERNMENT_EVIDENCE').first()).toBeVisible({ timeout: 150000 });
    await expect(page.locator('text=No grounded source document clauses matched this query')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Grounded Official Evidence Citations:')).toHaveCount(0);

    console.log('GOV 2 PASSED: Unrelated query refused with zero citations');
  });

  test('GOV 3: Project-data question answered from live database with Live Data citation', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/government-instructions`);
    await expect(page.locator('text=GOVERNMENT AI KNOWLEDGE & RAG ASSISTANT')).toBeVisible({ timeout: 15000 });

    const input = page.locator('input[placeholder="e.g. What are the bidder eligibility requirements?"]');
    await input.fill('Which bid has the highest compliance percentage?');
    await page.locator('button[type="submit"]:has-text("ASK AI")').click();

    await expect(page.locator('text=Grounding Status: GROUNDED')).toBeVisible({ timeout: 150000 });
    await expect(page.locator('text=Live Project Data (SIH26100 Bid Database)').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Live Data').first()).toBeVisible();
    const answer = await page.locator('p.bg-slate-900\\/80').first().textContent();
    expect((answer || '').toLowerCase()).toContain('gem-2026-');
    // Deterministic: the Live Data citation quote must carry the real compliance figure (GEM-2026-001 = 78.6, the max).
    const quote = await page.locator('p.italic').first().textContent();
    expect((quote || '')).toContain('78.6');
    expect((quote || '')).toContain('GEM-2026-001');

    console.log('GOV 3 PASSED: Live project context answer with Live Data citation');
  });

  test('ISO 1: Bidder blocked from Government AI page (route guard + API 403)', async ({ page }) => {
    await login(page, BIDDER_EMAIL, BIDDER_PASSWORD, '**/user/dashboard');
    await page.goto(`${BASE_URL}/government-instructions`);
    await page.waitForURL('**/user/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Bidder Submission Portal')).toBeVisible({ timeout: 10000 });

    const token = await page.evaluate(() => localStorage.getItem('gem_auth_token'));
    expect(token).toBeTruthy();
    const askResponse = await page.request.post(
      `${BASE_URL}/api/government/ask`,
      { headers: { Authorization: `Bearer ${token}` }, data: { question: 'What is our GST number?' } }
    );
    expect(askResponse.status()).toBe(403);

    console.log('ISO 1 PASSED: Bidder blocked from Government AI UI and API');
  });
});
