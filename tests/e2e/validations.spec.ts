import { test, expect } from '@playwright/test';

test.describe('Validation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to create validation page', async ({ page }) => {
    await page.click('text=New Validation');
    await expect(page).toHaveURL(/\/validations\/new/);
  });

  test('should create a new validation', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'AI-powered task management tool');
    await page.fill('input[name="targetAudience"]', 'Small business owners');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'task management, productivity, automation');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page).toHaveURL(/\/validations\/\w+/);
  });

  test('should show validation form errors', async ({ page }) => {
    await page.goto('/validations/new');
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=Idea is required')).toBeVisible({ timeout: 5000 });
  });

  test('should run market analysis', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Consumers');
    await page.fill('input[name="industry"]', 'E-commerce');
    await page.fill('input[name="geographicFocus"]', 'Global');
    await page.fill('input[name="keywords"]', 'shopping, online');
    
    await page.click('button:has-text("Create Validation")');
    
    // Wait for market analysis to complete
    await expect(page.locator('text=Market Analysis')).toBeVisible({ timeout: 60000 });
  });

  test('should display market scan results', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Consumers');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'software, tools');
    
    await page.click('button:has-text("Create Validation")');
    
    // Wait for results
    await page.waitForTimeout(10000);
    
    // Check for market signals
    await expect(page.locator('text=Reddit')).toBeVisible({ timeout: 10000 });
  });

  test('should display sentiment analysis', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Consumers');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'software');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=Sentiment Analysis')).toBeVisible({ timeout: 60000 });
  });

  test('should display validation score', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Consumers');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'software');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=Validation Score')).toBeVisible({ timeout: 60000 });
    
    // Check for grade display
    await expect(page.locator('.grade')).toBeVisible({ timeout: 10000 });
  });

  test('should display competitor analysis', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Task Management Tool');
    await page.fill('input[name="targetAudience"]', 'Small Business');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'task, management');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=Competitor Analysis')).toBeVisible({ timeout: 60000 });
  });

  test('should display market size', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Enterprise');
    await page.fill('input[name="industry"]', 'AI');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'AI, automation');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=Market Size')).toBeVisible({ timeout: 60000 });
    
    // Check for TAM, SAM, SOM display
    await expect(page.locator('text=TAM')).toBeVisible({ timeout: 10000 });
  });

  test('should display MVP scope', async ({ page }) => {
    await page.goto('/validations/new');
    
    await page.fill('input[name="idea"]', 'Test Product');
    await page.fill('input[name="targetAudience"]', 'Small Business');
    await page.fill('input[name="industry"]', 'SaaS');
    await page.fill('input[name="geographicFocus"]', 'United States');
    await page.fill('input[name="keywords"]', 'productivity');
    
    await page.click('button:has-text("Create Validation")');
    
    await expect(page.locator('text=MVP Scope')).toBeVisible({ timeout: 60000 });
    
    // Check for feature list
    await expect(page.locator('text=Recommended Features')).toBeVisible({ timeout: 10000 });
  });

  test('should view validation history', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Validations');
    
    await expect(page).toHaveURL(/\/validations/);
    await expect(page.locator('text=Validation History')).toBeVisible({ timeout: 10000 });
  });

  test('should view validation details', async ({ page }) => {
    await page.goto('/validations');
    
    // Click on first validation
    const firstValidation = page.locator('[data-validation-id]').first();
    await firstValidation.click();
    
    await expect(page).toHaveURL(/\/validations\/\w+/);
  });

  test('should delete a validation', async ({ page }) => {
    await page.goto('/validations');
    
    const firstValidation = page.locator('[data-validation-id]').first();
    await firstValidation.hover();
    
    await page.click('button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    await expect(page.locator('text=Validation deleted')).toBeVisible({ timeout: 5000 });
  });
});
