const { test, expect } = require('../../fixtures/fixtures');

test.use({ video: 'on' });

/**
 * Related Flow: Authentication & Authorization
 * 
 * This suite contains negative test scenarios for session expiration and access denied.
 * It verifies that the UI handles 401 and 403 API responses gracefully, usually by
 * redirecting to the login screen or showing an appropriate error modal, rather than
 * swallowing the error and leaving the user in a broken state.
 */
test.describe('Auth Expiry & Permissions - Negative Coverage', () => {

  /**
   * Scenario 1: Mock 401 Unauthorized (Session Expired)
   */
  test('Should handle 401 Unauthorized by gracefully redirecting or showing expiry modal', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating to a secure page (Find Sales Order)...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/FindOrder`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully first
    const searchBtn = authenticatedPage.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 401 Unauthorized error...');
    await authenticatedPage.route('**/*', async route => {
      // Intercept POST requests
      if (route.request().method() === 'POST') {
        console.log(`Intercepted request to: ${route.request().url()}`);
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Unauthorized - Session Expired" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by clicking the Search button...');
    await searchBtn.click({ force: true });

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI handled the expiry gracefully...');
    
    // In a 401 scenario, the UI should ideally redirect to login, or show an alert modal.
    // It should NOT just swallow the error and leave the old UI fully interactive.

    // Check if we got redirected to login
    const currentUrl = authenticatedPage.url();
    const isRedirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('microsoftonline');

    // Check if a session expiry modal or toast is visible
    const expiryModal = authenticatedPage.locator('text=/session expired/i, text=/unauthorized/i, text=/login required/i').first();
    const isModalVisible = await expiryModal.isVisible().catch(() => false);

    // If it's not redirected and no modal is visible, it's a failure of graceful degradation
    if (!isRedirectedToLogin && !isModalVisible) {
       // We force an expect failure here to mark the test as failed with a clear message
       expect(isRedirectedToLogin || isModalVisible, 'Expected UI to redirect to login or show Session Expired modal on 401').toBeTruthy();
    }
  });

  /**
   * Scenario 2: Mock 403 Forbidden (Access Denied)
   */
  test('Should handle 403 Forbidden gracefully without crashing', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating to a secure page (Find Sales Order)...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/FindOrder`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully
    const searchBtn = authenticatedPage.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 403 Forbidden error...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST') {
        console.log(`Intercepted request to: ${route.request().url()}`);
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Forbidden - Access Denied" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by clicking the Search button...');
    await searchBtn.click({ force: true });

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI handled the 403 gracefully...');
    
    // In a 403 scenario, it shouldn't log you out, but it should explicitly say Access Denied.
    const accessDeniedModal = authenticatedPage.locator('text=/access denied/i, text=/forbidden/i, text=/permission/i').first();
    const isModalVisible = await accessDeniedModal.isVisible().catch(() => false);

    if (!isModalVisible) {
        // If no warning is given to the user, the test fails
        expect(isModalVisible, 'Expected UI to show an Access Denied or Forbidden message on 403').toBeTruthy();
    }
  });

});
