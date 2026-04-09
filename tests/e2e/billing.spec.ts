import { test, expect } from '@playwright/test';

test.describe('Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in first
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator('text=Pricing')).toBeVisible();
  });

  test('should display all pricing plans', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Individual')).toBeVisible();
    await expect(page.locator('text=Team')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.locator('text=5 validations/month')).toBeVisible();
    await expect(page.locator('text=50 validations/month')).toBeVisible();
    await expect(page.locator('text=200 validations/month')).toBeVisible();
  });

  test('should start checkout for Individual plan', async ({ page }) => {
    await page.goto('/pricing');
    
    await page.click('button:has-text("Get Started") >> nth=1');
    
    // Should redirect to Stripe checkout or show modal
    await expect(page).toHaveURL(/\/billing\/checkout|stripe/);
  });

  test('should display current plan in dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=Current Plan')).toBeVisible();
  });

  test('should navigate to billing settings', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).toHaveURL(/\/settings\/billing/);
    await expect(page.locator('text=Billing')).toBeVisible();
  });

  test('should display subscription status', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await expect(page.locator('text=Subscription')).toBeVisible();
  });

  test('should upgrade plan', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await page.click('button:has-text("Upgrade")');
    
    await expect(page).toHaveURL(/\/billing\/upgrade|\/pricing/);
  });

  test('should show usage statistics', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await expect(page.locator('text=Usage')).toBeVisible();
    await expect(page.locator('text=Validations this month')).toBeVisible();
  });

  test('should cancel subscription', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await page.click('button:has-text("Cancel Subscription")');
    
    // Confirm cancellation
    await page.click('button:has-text("Confirm")');
    
    await expect(page.locator('text=Subscription cancelled')).toBeVisible({ timeout: 5000 });
  });

  test('should downgrade plan', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await page.click('button:has-text("Downgrade")');
    
    await expect(page.locator('text=Downgrade to')).toBeVisible();
  });

  test('should view billing history', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await page.click('text=Billing History');
    
    await expect(page.locator('text=Invoices')).toBeVisible();
  });

  test('should download invoice', async ({ page }) => {
    await page.goto('/settings/billing');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download Invoice")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('invoice');
  });

  test('should update payment method', async ({ page }) => {
    await page.goto('/settings/billing');
    
    await page.click('button:has-text("Update Payment Method")');
    
    await expect(page.locator('text=Payment Method')).toBeVisible();
  });
});
