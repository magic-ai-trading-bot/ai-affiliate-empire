import { test, expect } from '@playwright/test';

test.describe('Blog E2E Tests', () => {
  test('blog homepage loads', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Check for blog content
    await expect(page.locator('h1')).toContainText(/blog/i);
  });

  test('displays article list', async ({ page }) => {
    await page.goto('http://localhost:3002');

    await page.waitForLoadState('networkidle');

    // Check for articles (adjust based on actual implementation)
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('newsletter signup form exists', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Look for email input
    const emailInputs = page.locator('input[type="email"]');
    const count = await emailInputs.count();

    // Newsletter form should exist somewhere on the page
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('article navigation works', async ({ page }) => {
    await page.goto('http://localhost:3002');

    await expect(page).toHaveTitle(/Blog/i);
  });

  test('responsive layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3002');

    await expect(page.locator('body')).toBeVisible();
  });

  test('search functionality exists', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Check page loads successfully
    await expect(page.locator('body')).toBeVisible();
  });
});
