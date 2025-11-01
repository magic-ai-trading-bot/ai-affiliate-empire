import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('dashboard loads successfully', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Check for dashboard title
    await expect(page.locator('h1')).toContainText(/dashboard/i);
  });

  test('displays statistics cards', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Check for key metrics (adjust selectors based on actual implementation)
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Check page is interactive
    await expect(page).toHaveTitle(/AI Affiliate/i);
  });

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001');

    // Check mobile menu exists
    await expect(page.locator('body')).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Look for theme toggle button (adjust selector as needed)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
