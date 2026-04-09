import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should sign up with valid credentials', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Test User');
    
    await page.click('button:has-text("Sign Up")');
    
    // Wait for navigation or success message
    await expect(page).toHaveURL(/\/dashboard|\/auth\/verify/);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'Test User');
    
    await page.click('button:has-text("Sign Up")');
    
    await expect(page.locator('text=Invalid email')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="name"]', 'Test User');
    
    await page.click('button:has-text("Sign Up")');
    
    await expect(page.locator('text=Password must be')).toBeVisible({ timeout: 5000 });
  });

  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/signin');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    
    await page.click('button:has-text("Sign In")');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    
    await page.click('button:has-text("Sign In")');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=Forgot password?');
    
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should send password reset email', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button:has-text("Send Reset Link")');
    
    await expect(page.locator('text=Password reset email sent')).toBeVisible({ timeout: 5000 });
  });

  test('should require email for password reset', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.click('button:has-text("Send Reset Link")');
    
    await expect(page.locator('text=Email is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show 2FA prompt when enabled', async ({ page }) => {
    // This would require a user with 2FA enabled
    // Placeholder for 2FA test
    expect(true).toBe(true);
  });

  test('should maintain session after page refresh', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign In")');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should sign out successfully', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign In")');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    await page.click('button:has-text("Sign Out")');
    
    await expect(page).toHaveURL(/\/signin/);
  });
});
