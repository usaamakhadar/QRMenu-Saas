import { test, expect } from '@playwright/test';

const testEmail = `kanban-${Date.now()}@restaurant.com`;
const testPassword = 'password123';

test.describe('Kitchen Kanban & Dashboard Flow', () => {

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Register
    await page.goto('/kitchen/login');
    await page.click('button:has-text("Create Account")');
    await page.fill('[placeholder="Restaurant Name"]', 'Kanban Test Restaurant');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Create My Restaurant")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);
    await context.close();
  });

  test('should load Kanban board and display core columns', async ({ page }) => {
    // Login
    await page.goto('/kitchen/login');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Sign In to Dashboard")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);

    // Verify Kanban columns are present
    await expect(page.locator('h3', { hasText: 'New' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'In Progress' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Ready' })).toBeVisible();
    
    // Check if the generic 'No orders' placeholder is visible
    await expect(page.locator('text=No new orders')).toBeVisible();
  });

});
