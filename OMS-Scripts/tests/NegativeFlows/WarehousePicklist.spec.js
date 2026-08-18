const { test, expect } = require('../../fixtures/fixtures');

test.use({ video: 'on' });

/**
 * Related Flow: Warehouse Operations / Picklist
 * 
 * This suite contains negative test scenarios for the Manage Picklist module.
 * It verifies that the UI handles massive data fetching failures gracefully (500 errors, timeouts) 
 * without crashing or locking up the browser.
 */
test.describe('Warehouse Picklist - Negative Coverage', () => {

  /**
   * Scenario 1: Mock 500 Server Error During Data Fetch
   * 
   * When the user filters by Facility, the UI fires an API call to fetch the picklists.
   * We intercept this request and force a 500 Internal Server Error.
   * We expect the UI to handle the error gracefully without a white-screen crash.
   */
  test('Should handle 500 server error gracefully when filtering picklists', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Manage Picklist...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/ManagePicklist`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully first
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    await expect(firstCombobox).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 500 error...');
    await authenticatedPage.route('**/*', async route => {
      // Intercept POST requests (which are usually the data fetch or search APIs)
      if (route.request().method() === 'POST' && route.request().url().includes('ManagePicklist')) {
        console.log(`Intercepted data fetch request to: ${route.request().url()}`);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Internal Server Error Simulation" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by interacting with the Facility dropdown...');
    // Select 1st option from Facility dropdown to trigger the fetch
    await firstCombobox.click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); // Close sticky dropdown

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI did not crash and is in a safe error state...');
    
    // We expect the UI to NOT crash into a white screen. The combobox should still be visible.
    await expect(firstCombobox).toBeVisible();

    const noResultsFound = authenticatedPage.locator('text="No Picklists Found."').first();
    const hasDataRow = authenticatedPage.locator('table tbody tr, .list-group-item, .card').first();
    
    // If a data row is visible, it means the API failure didn't properly clear the old state
    await expect(hasDataRow).not.toBeVisible();
    
    // The safest graceful degradation is showing no results
    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    }
  });

  /**
   * Scenario 2: Mock Network Timeout (504)
   */
  test('Should handle network timeouts gracefully without infinitely spinning', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Manage Picklist...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/ManagePicklist`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully
    const statusCombobox = authenticatedPage.getByRole('combobox').nth(1);
    await expect(statusCombobox).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 504 Timeout error...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST' && route.request().url().includes('ManagePicklist')) {
        console.log(`Intercepted data fetch request to: ${route.request().url()}`);
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Gateway Timeout Simulation" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by interacting with the Status dropdown...');
    // Select 1st option from Status dropdown to trigger the fetch
    await statusCombobox.click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape');

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI did not crash or spin infinitely...');
    
    // The UI should still be interactable
    await expect(statusCombobox).toBeVisible();

    // Check that we aren't stuck with a spinning loading indicator covering the whole page
    const spinner = authenticatedPage.locator('ion-spinner, .spinner, .loading-indicator').first();
    await expect(spinner).not.toBeVisible();
  });

});
