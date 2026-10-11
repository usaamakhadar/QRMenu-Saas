import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding', () => {
  const testEmail = `test-${Date.now()}@restaurant.com`;
  const testPassword = 'password123';
  const testName = `Playwright Bistro ${Date.now()}`;

  test('should register a new restaurant successfully', async ({ page }) => {
    await page.goto('/kitchen/login');

    // Switch to Register mode
    await page.click('button:has-text("Create Account")');

    // Fill in registration details
    await page.fill('[placeholder="Restaurant Name"]', testName);
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);

    // Submit
    await page.click('button:has-text("Create My Restaurant")');

    // Should redirect to the kitchen dashboard with the generated slug
    await expect(page).toHaveURL(/\/kitchen\/.+/);
    
    // Verify we landed on the dashboard (Settings or Orders layout should be present)
    await expect(page.locator('text=Active Service')).toBeVisible({ timeout: 15000 });
  });

  test('should login successfully with existing account', async ({ page }) => {
    // This assumes the account from the previous test is already created
    // However, since tests might run independently, it's better to create an account via API or rely on sequential execution
    // Playwright config is set to workers: 1, so tests run sequentially.
    
    // Clear localStorage to simulate fresh session
    await page.addInitScript(() => window.localStorage.clear());

    await page.goto('/kitchen/login');

    // Default mode is login
    await page.fill('[placeholder="Email Address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);

    // Submit
    await page.click('button:has-text("Sign In to Dashboard")');

    // Should redirect to the kitchen dashboard
    await expect(page).toHaveURL(/\/kitchen\/.+/);
    await expect(page.locator('text=Active Service')).toBeVisible({ timeout: 15000 });
  });

  test('should block unauthenticated access to dashboard', async ({ page }) => {
    // Clear session
    await page.addInitScript(() => window.localStorage.clear());
    
    // Try to access a dashboard route
    await page.goto('/kitchen/some-restaurant-id');

    // Should be redirected back to login
    await expect(page).toHaveURL(/\/kitchen\/login/);
  });
});
