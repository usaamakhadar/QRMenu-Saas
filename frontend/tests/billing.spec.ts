import { test, expect } from '@playwright/test';

const testEmail = `billing-${Date.now()}@restaurant.com`;
const testPassword = 'password123';

test.describe('Cashier & Billing Flow', () => {

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Register
    await page.goto('/kitchen/login');
    await page.click('button:has-text("Create Account")');
    await page.fill('[placeholder="Restaurant Name"]', 'Billing Test Restaurant');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Create My Restaurant")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);
    await context.close();
  });

  test('should load Cashier Billing Desk and display empty state', async ({ page }) => {
    // Login
    await page.goto('/kitchen/login');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Sign In to Dashboard")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);

    // Navigate to Billing
    await page.goto(`${page.url()}/billing`);

    // Verify Cashier Desk is present
    await expect(page.locator('h2', { hasText: 'Cashier & Billing Desk' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Unpaid Bills' })).toBeVisible();
    
    // Because no orders are placed yet, we should see empty state text
    await expect(page.locator('text=No pending payments.')).toBeVisible();
  });

});
