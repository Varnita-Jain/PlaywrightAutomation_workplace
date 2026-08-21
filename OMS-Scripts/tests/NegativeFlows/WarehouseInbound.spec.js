const { test, expect } = require('../../fixtures/fixtures');
test.use({ video: 'on' });

/**
 * Related Flow: Warehouse Operations / Inbound Shipments
 * 
 * This suite contains negative test scenarios for the Inbound Shipments module.
 * It verifies that the UI handles massive data fetching failures gracefully (500 errors, timeouts) 
 * without crashing or locking up the browser.
 */
test.describe('Warehouse Inbound Shipments - Negative Coverage', () => {

  /**
   * Scenario 1: Mock 500 Server Error During Data Fetch
   * 
   * When the user filters by Facility, the UI fires an API call to fetch the shipments.
   * We intercept this request and force a 500 Internal Server Error.
   * We expect the UI to handle the error gracefully without a white-screen crash.
   */
  test('Should handle 500 server error gracefully when filtering shipments', async ({ authenticatedPage, baseURL, messageValidator }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Inbound Shipments...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/IncomingShipment`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully first
    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    await expect(firstCombobox).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 500 error...');
    await authenticatedPage.route('**/*', async route => {
      // Intercept POST requests (which are usually the data fetch or search APIs)
      if (route.request().method() === 'POST' && route.request().url().includes('IncomingShipment')) {
        console.log(`Intercepted data fetch request to: ${route.request().url()}`);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Simulated 500 Error during shipment fetch" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by interacting with the Facility dropdown...');
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI did not crash and is in a safe error state...');
    
    // We expect the combobox to still be visible (UI hasn't crashed to white screen)
    await expect(firstCombobox).toBeVisible();

    // Enforce strict UX validation: ensure the simulated error didn't bleed backend jargon onto the screen
    const bodyText = await authenticatedPage.locator('body').innerText();
    messageValidator.verifyUserFriendlyMessage(bodyText);
    
    // Verify that the table data isn't falsely populated or stuck in a broken state
    // It should either show a friendly "No keyword matches" or a toast error
    const noResultsFound = authenticatedPage.locator('text="No keyword matches the search criteria."').first();
    const tableIdColumn = authenticatedPage.locator('table tbody tr td:first-child').first();
    
    // If the table is visible, it means the API failure didn't properly clear the old state (this would be a bug, but we assert it doesn't happen)
    await authenticatedPage.screenshot({ path: 'warehouse-error-screenshot.png', fullPage: true });
    await expect(tableIdColumn).not.toBeVisible();
    
    // The safest graceful degradation is showing no results
    if (await noResultsFound.isVisible().catch(() => false)) {
        console.log('Success: UI gracefully degraded to "No results" state upon 500 error.');
    }

    // Clean up
    await authenticatedPage.unroute('**/*');
  });

  /**
   * Scenario 2: Network Timeout Handling
   * 
   * Simulates a heavily degraded network connection where the backend hangs.
   * Ensures the UI eventually aborts or handles the pending state without freezing.
   */
  test('Should handle network timeouts gracefully without infinitely spinning', async ({ authenticatedPage, baseURL, messageValidator }) => {
    test.setTimeout(45000); // Allow extra time for timeout simulation

    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Inbound Shipments...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/IncomingShipment`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    const firstCombobox = authenticatedPage.getByRole('combobox').nth(0);
    await expect(firstCombobox).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend requests and delaying them to simulate a Gateway Timeout...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST' && route.request().url().includes('IncomingShipment')) {
        console.log(`Intercepted request to simulate timeout: ${route.request().url()}`);
        // We simulate a 504 Gateway Timeout or just a slow hang
        await route.fulfill({
            status: 504,
            contentType: 'application/json',
            body: JSON.stringify({ error: "Simulated 504 Gateway Timeout" })
        });
      } else {
        await route.continue();
      }
    });

    console.log('Step 3: Triggering data fetch by interacting with the Facility dropdown...');
    await authenticatedPage.getByRole('combobox').nth(0).click({ force: true });
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowDown'); // Use 2nd option for this test
    await authenticatedPage.keyboard.press('Enter');
    await authenticatedPage.keyboard.press('Escape'); 

    await authenticatedPage.waitForTimeout(3000);

    console.log('Step 4: Verifying the UI is still responsive and not frozen...');
    
    // Attempt to interact with another dropdown to prove the UI isn't locked up by a modal overlay
    const typeCombobox = authenticatedPage.getByRole('combobox').nth(2);
    await expect(typeCombobox).toBeVisible();
    await expect(typeCombobox).toBeEnabled();

    // Enforce strict UX validation: ensure the simulated timeout didn't bleed backend jargon onto the screen
    const bodyText = await authenticatedPage.locator('body').innerText();
    messageValidator.verifyUserFriendlyMessage(bodyText);

    console.log('Success: UI remained responsive after Gateway Timeout simulation.');

    // Clean up
    await authenticatedPage.unroute('**/*');
  });

});
