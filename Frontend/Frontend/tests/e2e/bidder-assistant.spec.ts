import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const USER_EMAIL = 'user@demo.gov.in';
const USER_PASSWORD = 'User@123';

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="name@organisation.gov.in"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe('Phase 3 Bidder AI Assistant E2E', () => {

  test('ASST 1: Bidder dashboard shows AI Assistant tab', async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}/user/dashboard`);
    await expect(page.locator('text=Bidder Submission Portal')).toBeVisible({ timeout: 10000 });

    const assistantTab = page.getByRole('tab', { name: 'AI Assistant' });
    await expect(assistantTab).toBeVisible();
    await assistantTab.click();

    await expect(page.locator('text=Select Bid for AI Assistance')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bidder AI Assistant')).toBeVisible();
    await expect(page.locator('text=Tender-aware')).toBeVisible();

    console.log('ASST 1 PASSED: AI Assistant tab renders');
  });

  test('ASST 2: Suggested question returns grounded answer with citations', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}/user/dashboard`);
    await page.getByRole('tab', { name: 'AI Assistant' }).click();
    await expect(page.locator('text=Select Bid for AI Assistance')).toBeVisible({ timeout: 5000 });

    // Ask via suggested question chip
    await page.locator('button:has-text("What documents are required for this tender?")').click();

    // Wait for the assistant reply bubble specifically (not the static "Evidence-grounded" header)
    const replyBubble = page.locator('[role="log"] .whitespace-pre-wrap').nth(1);
    await expect(replyBubble).toBeVisible({ timeout: 120000 });
    const reply = await replyBubble.textContent();
    expect((reply || '').length).toBeGreaterThan(20);

    // At least one grounded status badge and one requirement citation chip (REQ-xxx)
    await expect(page.locator('text=✓ Grounded').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="log"] [title*="requirement"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[role="log"] .font-mono + span').filter({ hasText: /^REQ-\d+$/ }).first()).toBeVisible({ timeout: 5000 });

    console.log('ASST 2 PASSED: Grounded answer with citations rendered');
  });

  test('ASST 3: Free-text question round-trips through chat input', async ({ page }) => {
    test.setTimeout(180000);
    await login(page, USER_EMAIL, USER_PASSWORD);
    await page.goto(`${BASE_URL}/user/dashboard`);
    await page.getByRole('tab', { name: 'AI Assistant' }).click();
    await expect(page.locator('text=Select Bid for AI Assistance')).toBeVisible({ timeout: 5000 });

    const textarea = page.locator('textarea[placeholder*="Ask about requirements"]');
    await textarea.fill('Why is my bid under review?');
    await textarea.press('Enter');

    // Assistant reply content appears (any non-empty bubble after loading spinner ends)
    await expect(page.locator('[role="log"] .whitespace-pre-wrap').nth(1)).toBeVisible({ timeout: 120000 });
    const reply = await page.locator('[role="log"] .whitespace-pre-wrap').nth(1).textContent();
    expect((reply || '').length).toBeGreaterThan(20);

    console.log('ASST 3 PASSED: Free-text question answered:', (reply || '').slice(0, 120));
  });
});
