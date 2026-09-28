import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080';
const USER_EMAIL = 'user@demo.gov.in';
const USER_PASSWORD = 'User@123';
const BID = 'GEM-2026-001';

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="name@organisation.gov.in"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function openAssistant(page) {
  await page.goto(`${BASE_URL}/user/dashboard`);
  await page.getByRole('tab', { name: 'AI Assistant' }).click();
  await expect(page.locator('text=Select Bid for AI Assistance')).toBeVisible({ timeout: 10000 });
  await page.locator('select').first().selectOption(BID);
  await page.waitForTimeout(400);
}

async function trackChat(page): Promise<number[]> {
  const statuses: number[] = [];
  page.on('response', (res) => {
    if (res.url().includes('assistant/chat')) statuses.push(res.status());
  });
  return statuses;
}

async function askAndWait(page, question, chatStatuses: number[]) {
  const before = chatStatuses.length;
  const textarea = page.locator('textarea[placeholder*="Ask about requirements"]');
  await textarea.fill(question);
  await textarea.press('Enter');
  await expect
    .poll(() => chatStatuses.length, { timeout: 180000, message: `No chat response for: ${question}` })
    .toBeGreaterThan(before);
  await page.waitForTimeout(700);
}

test.describe('Phase 3 Bidder AI Assistant E2E', () => {

  test('ASST 1: Requirements question returns grounded answer with requirement citations', async ({ page }) => {
    test.setTimeout(240000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    await openAssistant(page);

    await page.locator('button:has-text("What documents are required for this tender?")').click();
    await expect(page.locator('[role="log"] .whitespace-pre-wrap').nth(1)).toBeVisible({ timeout: 180000 });
    await page.waitForTimeout(500);

    await expect(page.locator('text=✓ Grounded').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="log"] [title*="Type: requirement"]').first()).toBeVisible({ timeout: 15000 });
    const reply = await page.locator('[role="log"] .whitespace-pre-wrap').last().textContent();
    expect((reply || '').length).toBeGreaterThan(20);
    expect((reply || '')).not.toContain('[SOURCE');

    console.log('ASST 1 PASSED: grounded requirements answer with citation chips');
  });

  test('ASST 2: Bidder fact question (GSTIN) returns grounded answer with fact citation', async ({ page }) => {
    test.setTimeout(240000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    const chatStatuses = await trackChat(page);
    await openAssistant(page);

    await askAndWait(page, 'What is my GSTIN?', chatStatuses);
    expect(chatStatuses[chatStatuses.length - 1]).toBe(200);

    await expect(page.locator('text=✓ Grounded').last()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[title*="Type: fact"]').first()).toBeVisible({ timeout: 15000 });
    const reply = await page.locator('[role="log"] .whitespace-pre-wrap').last().textContent();
    expect(reply || '').toContain('07AABCT1234F1Z5');
    expect(reply || '').not.toContain('[SOURCE');

    console.log('ASST 2 PASSED: GSTIN answered from bidder facts with fact citation');
  });

  test('ASST 3: Unsupported question returns INSUFFICIENT_EVIDENCE with no citations', async ({ page }) => {
    test.setTimeout(240000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    const chatStatuses = await trackChat(page);
    await openAssistant(page);

    await askAndWait(page, 'What is the weather on Mars?', chatStatuses);
    expect(chatStatuses[chatStatuses.length - 1]).toBe(200);

    await expect(page.locator('text=⚠ Insufficient Evidence').last()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=✓ Grounded')).toHaveCount(0);
    const chips = await page.locator('[role="log"] [title*="Type:"]').count();
    expect(chips).toBe(0);
    const reply = (await page.locator('[role="log"] .whitespace-pre-wrap').last().textContent()) || '';
    expect(reply.length).toBeGreaterThan(10);
    expect(reply).not.toContain('[SOURCE');
    expect(reply).not.toContain('dust storms');

    console.log('ASST 3 PASSED: refusal with INSUFFICIENT_EVIDENCE and zero citations');
  });

  test('ASST 4: Multi-turn conversation keeps working (regression: chat_history 400)', async ({ page }) => {
    test.setTimeout(300000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    const chatStatuses = await trackChat(page);
    await openAssistant(page);

    // Turn 1 — bidder fact with a documented conflict (12.5 vs 11.8 crore)
    await askAndWait(page, 'What is my turnover?', chatStatuses);
    expect(chatStatuses[chatStatuses.length - 1]).toBe(200);
    await expect(page.locator('text=✓ Grounded').last()).toBeVisible({ timeout: 15000 });
    const first = (await page.locator('[role="log"] .whitespace-pre-wrap').last().textContent()) || '';
    expect(first).toContain('12.5');

    // Turn 2 — follow-up depends on turn 1; previously the full AssistantMessage
    // history (citations array) caused HTTP 400 from the second turn onward.
    await askAndWait(page, 'Is that sufficient for this tender?', chatStatuses);
    expect(chatStatuses.length).toBeGreaterThanOrEqual(2);
    expect(chatStatuses[chatStatuses.length - 1]).toBe(200);
    await expect(page.locator('text=Dismiss')).toHaveCount(0);
    const second = (await page.locator('[role="log"] .whitespace-pre-wrap').last().textContent()) || '';
    expect(second.length).toBeGreaterThan(20);

    // Turn 3 — explicit unsupported follow-up still refused mid-conversation
    await askAndWait(page, 'What is the weather on Saturn?', chatStatuses);
    expect(chatStatuses[chatStatuses.length - 1]).toBe(200);
    await expect(page.locator('text=⚠ Insufficient Evidence').last()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Dismiss')).toHaveCount(0);

    console.log('ASST 4 PASSED: multi-turn statuses =', chatStatuses.join(','));
  });

  test('ASST 5: Isolation — another bidder cannot use this bid\'s assistant', async ({ request }) => {
    test.setTimeout(60000);
    const unique = Date.now();
    const digits = String(unique).slice(-6);
    const register = await request.post(`${API_URL}/api/auth/register/bidder`, {
      data: {
        email: `bidder-e2e-${unique}@test.com`,
        password: 'BidderE2E@123',
        name: 'E2E Bidder B',
        organization: `Org B ${unique}`,
        mobile: String(7000000000 + (unique % 99999999)),
        gstin: `09AAB${digits}B1Z9`,
        registrationNo: `REG-E2E-${unique}`,
      },
    });
    expect(register.status()).toBe(200);
    const { token } = await register.json();
    expect(token).toBeTruthy();

    const denied = await request.post(`${API_URL}/api/bids/${BID}/assistant/chat`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { question: 'What is my GSTIN?', chat_history: [] },
    });
    expect(denied.status()).toBe(403);
    const body = await denied.json();
    expect(JSON.stringify(body)).toContain('another bidder');

    console.log('ASST 5 PASSED: cross-bidder assistant access blocked with 403');
  });
});
