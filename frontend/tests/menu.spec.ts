import { test, expect } from '@playwright/test';

// Use a consistent restaurant name across this file
const testEmail = `menu-${Date.now()}@restaurant.com`;
const testPassword = 'password123';

test.describe('Menu & Settings Management', () => {
  // Setup: Create a restaurant and login before tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Register account
    await page.goto('/kitchen/login');
    await page.click('button:has-text("Create Account")');
    await page.fill('[placeholder="Restaurant Name"]', 'Menu Test Restaurant');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Create My Restaurant")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);
    await context.close();
  });

  test('should add a new menu section', async ({ page }) => {
    // Login
    await page.goto('/kitchen/login');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Sign In to Dashboard")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);

    // Navigate to Menu
    await page.goto(`${page.url()}/menu`);

    // Click Add Menu Section
    await page.locator('button', { hasText: 'Add Menu Section' }).click();
    
    // Fill category name
    await page.fill('[placeholder="Category Name"]', 'Desserts');
    await page.waitForTimeout(500); // Wait for React state to update
    await page.locator('button', { hasText: 'Save Category' }).click();

    // Verify it was added
    await expect(page.locator('h3', { hasText: 'Desserts' })).toBeVisible({ timeout: 15000 });
  });

  test('should add a new menu item', async ({ page }) => {
    await page.goto('/kitchen/login');
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);
    await page.click('button:has-text("Sign In to Dashboard")');
    await page.waitForURL(/\/kitchen\/(?!login).+/);

    await page.goto(`${page.url()}/menu`);

    // Add Menu Item
    await page.locator('button', { hasText: 'Add Menu Item' }).click();
    await page.fill('[placeholder="Dish Name"]', 'Chocolate Cake');
    await page.fill('[placeholder="Description"]', 'Rich chocolate layer cake');
    await page.fill('[placeholder="Price"]', '6.99');
    
    // Select the category we just created or default
    await page.selectOption('select', { label: 'Desserts' }).catch(() => {
        // Fallback to first available category
        page.selectOption('select', { index: 1 });
    });

    await page.waitForTimeout(500); // Wait for React state to update
    await page.locator('button', { hasText: 'Save Menu Item' }).click();

    // Verify it was added
    await expect(page.locator('h4', { hasText: 'Chocolate Cake' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=$6.99')).toBeVisible();
  });
});
