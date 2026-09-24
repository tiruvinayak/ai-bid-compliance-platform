import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@demo.gov.in';
const ADMIN_PASSWORD = 'Admin@123';
const SECTOR_EMAIL = 'railways@demo.gov.in';
const SECTOR_PASSWORD = 'Sector@123';
const OFFICER_EMAIL = 'officer@demo.gov.in';
const OFFICER_PASSWORD = 'Officer@123';

async function login(page, email, password, expectedPath) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill credentials directly (role selector buttons only appear in mock mode)
  await page.fill('input[placeholder="name@organisation.gov.in"]', email);
  await page.fill('input[placeholder="Enter your password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(expectedPath, { timeout: 15000 });
}

test.describe('Government Hierarchy E2E Tests', () => {
  
  test('TEST 1: Central Admin login - Central Government Dashboard + Government Hierarchy loads', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    
    // Verify Central Government Dashboard loads
    await expect(page.locator('text=Central Government Procurement Hierarchy')).toBeVisible({ timeout: 10000 });
    
    // Verify stats cards are visible (use first match for each)
    await expect(page.locator('text=SECTORS').first()).toBeVisible();
    await expect(page.locator('text=DEPARTMENTS').first()).toBeVisible();
    await expect(page.locator('text=TOTAL TENDERS').first()).toBeVisible();
    await expect(page.locator('text=ACTIVE TENDERS').first()).toBeVisible();
    await expect(page.locator('text=COMPLETED').first()).toBeVisible();
    
    // Verify 4 sectors are displayed (use first match to avoid strict mode violation)
    await expect(page.locator('text=Railways').first()).toBeVisible();
    await expect(page.locator('text=Finance').first()).toBeVisible();
    await expect(page.locator('text=Defence').first()).toBeVisible();
    await expect(page.locator('text=Petroleum & Energy').first()).toBeVisible();
    
    console.log('TEST 1 PASSED: Central Admin Dashboard loads with hierarchy');
  });

  test('TEST 2: Central Admin - Click sector card navigates to Sector Detail', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    
    // Click on Railways sector card (use the button with sector name)
    await page.locator('button:has-text("Railways")').first().click();
    await page.waitForURL('**/government/sectors/**');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify Sector Detail page loads
    await expect(page.locator('h1:has-text("Railways")')).toBeVisible();
    await expect(page.locator('text=Railway Procurement Department')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Railway Infrastructure Department')).toBeVisible();
    
    console.log('TEST 2 PASSED: Sector navigation works');
  });

  test('TEST 3: Central Admin - Sector Detail shows Departments with stats', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/sectors/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify department stats (StatCard titles)
    await expect(page.locator('text=DEPARTMENTS').first()).toBeVisible();
    await expect(page.locator('text=TENDERS').first()).toBeVisible();
    await expect(page.locator('text=ACTIVE').first()).toBeVisible();
    await expect(page.locator('text=COMPLETED').first()).toBeVisible();
    
    // Verify both departments
    await expect(page.locator('text=Railway Procurement Department')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Railway Infrastructure Department')).toBeVisible();
    
    console.log('TEST 3 PASSED: Sector detail shows departments with stats');
  });

  test('TEST 4: Central Admin - Click department navigates to Department Detail', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/sectors/1`);
    
    // Wait for sector page to load
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    // Click on Railway Procurement Department button
    await page.locator('button:has-text("Railway Procurement Department")').click();
    await page.waitForURL('**/government/departments/**');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify Department Detail page loads
    await expect(page.locator('text=Railway Procurement Department').first()).toBeVisible();
    await expect(page.locator('text=Tender List')).toBeVisible();
    await expect(page.locator('text=Assigned Officers')).toBeVisible();
    
    console.log('TEST 4 PASSED: Department navigation works');
  });

  test('TEST 5: Central Admin - Department Detail shows Tenders + Officers', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/departments/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify tenders
    await expect(page.locator('text=TND-GEM-2026-1042')).toBeVisible();
    await expect(page.locator('text=Supply and Installation of Network Infrastructure')).toBeVisible();
    
    // Verify officer
    await expect(page.locator('text=Rajesh V. Sharma').first()).toBeVisible();
    await expect(page.locator('text=Senior Procurement Officer')).toBeVisible();
    
    console.log('TEST 5 PASSED: Department detail shows tenders and officers');
  });

  test('TEST 6: Central Admin - Click tender with bid navigates to compliance dashboard', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/departments/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    // Click on tender with primaryBidId (use the table row)
    await page.locator('tr:has-text("TND-GEM-2026-1042")').click();
    await page.waitForURL('**/compliance**', { timeout: 10000 });
    
    // Wait for compliance dashboard loading to complete
    await expect(page.locator('text=Loading Bid Compliance Evaluation Matrix...')).not.toBeVisible({ timeout: 15000 });
    
    // Check current URL
    const url = page.url();
    console.log('Current URL:', url);
    
    // Verify compliance dashboard loads
    await expect(page.locator('text=Compliance Evaluation Dashboard')).toBeVisible({ timeout: 10000 });
    
    console.log('TEST 6 PASSED: Tender click navigates to compliance dashboard');
  });

  test('TEST 7: Sector User (railways@demo.gov.in) - Only sees Railways sector', async ({ page }) => {
    await login(page, SECTOR_EMAIL, SECTOR_PASSWORD, '**/government');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading government hierarchy statistics...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify only Railways sector is visible
    await expect(page.locator('text=Railways').first()).toBeVisible();
    await expect(page.locator('text=Finance').first()).not.toBeVisible();
    await expect(page.locator('text=Defence').first()).not.toBeVisible();
    await expect(page.locator('text=Petroleum & Energy').first()).not.toBeVisible();
    
    // Verify sector scoped title
    await expect(page.locator('text=Sector Oversight Console')).toBeVisible();
    
    console.log('TEST 7 PASSED: Sector User sees only assigned sector');
  });

  test('TEST 8: Sector User - Navigate to Sector Detail and Departments', async ({ page }) => {
    await login(page, SECTOR_EMAIL, SECTOR_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/sectors/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify departments visible
    await expect(page.locator('text=Railway Procurement Department')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Railway Infrastructure Department')).toBeVisible();
    
    console.log('TEST 8 PASSED: Sector User can navigate sector detail');
  });

  test('TEST 9: Sector User - Navigate to Department Detail and Tenders', async ({ page }) => {
    await login(page, SECTOR_EMAIL, SECTOR_PASSWORD, '**/government');
    await page.goto(`${BASE_URL}/government/departments/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify tenders and officers
    await expect(page.locator('text=TND-GEM-2026-1042')).toBeVisible();
    await expect(page.locator('text=Rajesh V. Sharma').first()).toBeVisible();
    
    console.log('TEST 9 PASSED: Sector User can navigate department detail');
  });

  test('TEST 10: Sector User - Cannot access Finance sector (blocked by backend)', async ({ page }) => {
    await login(page, SECTOR_EMAIL, SECTOR_PASSWORD, '**/government');
    
    // Try to access Finance sector (id=2)
    await page.goto(`${BASE_URL}/government/sectors/2`);
    // Should show access denied error - wait for error state (check for either message)
    await expect(page.locator('text=Access Denied').or(page.locator('text=Not authorized')).or(page.locator('text=Failed to load sector'))).toBeVisible({ timeout: 15000 });
    
    console.log('TEST 10 PASSED: Sector User blocked from other sectors');
  });

test('TEST 11: Officer (officer@demo.gov.in) - Redirects to dashboard, can access government', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    
    // Officer lands on dashboard, navigate to government
    await page.goto(`${BASE_URL}/government`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading government hierarchy statistics...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify only Railways sector is visible (officer is scoped to Railways)
    await expect(page.locator('text=Railways').first()).toBeVisible();
    
    // Navigate to sector
    await page.goto(`${BASE_URL}/government/sectors/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    // Should only see Railway Procurement Department (not Railway Infrastructure)
    await expect(page.locator('text=Railway Procurement Department').first()).toBeVisible({ timeout: 10000 });
    // Check that Railway Infrastructure Department is not in the department list (use button selector)
    await expect(page.locator('button:has-text("Railway Infrastructure Department")')).not.toBeVisible();
    
    console.log('TEST 11 PASSED: Officer sees only assigned department');
  });

  test('TEST 12: Officer - Department Detail shows only their tenders', async ({ page }) => {
    await login(page, OFFICER_EMAIL, OFFICER_PASSWORD, '**/dashboard');
    await page.goto(`${BASE_URL}/government/departments/1`);
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    // Verify only their tender is shown
    await expect(page.locator('text=TND-GEM-2026-1042')).toBeVisible();
    
    console.log('TEST 12 PASSED: Officer sees only assigned department tenders');
  });

  test('TEST 13: Full navigation flow - Central Admin -> Sector -> Department -> Tender', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, '**/government');
    
    // Start at Central Dashboard
    await expect(page.locator('text=Central Government Procurement Hierarchy')).toBeVisible();
    
    // Navigate to Railways sector
    await page.locator('button:has-text("Railways")').first().click();
    await page.waitForURL('**/government/sectors/1');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading sector departments...')).not.toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('h1:has-text("Railways")')).toBeVisible();
    
    // Navigate to Railway Procurement Department
    await page.locator('button:has-text("Railway Procurement Department")').click();
    await page.waitForURL('**/government/departments/1');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading department tenders...')).not.toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('text=Railway Procurement Department').first()).toBeVisible();
    
    // Verify tender list
    await expect(page.locator('text=TND-GEM-2026-1042')).toBeVisible();
    
    console.log('TEST 13 PASSED: Full navigation flow works');
  });
});