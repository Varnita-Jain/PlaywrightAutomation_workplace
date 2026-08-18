const { test, expect } = require('../../fixtures/fixtures');
const { SalesReturnOMSPage } = require('../../pages/Order_Types/Return_Order/salesreturn.page');

/**
 * Related Flow: Sales Returns
 * 
 * This suite contains negative test scenarios for the Sales Returns module.
 * It verifies that the UI handles massive data fetching failures gracefully (500 errors, timeouts)
 * without crashing, locking up the browser, or leaving stale data on the screen.
 */
test.describe('Sales Return Filters - Negative Coverage', () => {

  test('Should handle 500 server error gracefully when filtering returns', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    test.slow();
    const salesReturnPage = new SalesReturnOMSPage(authenticatedPage, baseURL, clientId);
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Sales Returns...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');
    await salesReturnPage.navigateToSalesReturns();

    console.log('Step 2: Intercepting backend search requests to force 500 error...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST' && (route.request().url().includes('Return') || route.request().url().includes('find'))) {
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

    console.log('Step 3: Triggering data fetch by interacting with the Status dropdown...');
    // This will trigger the search because the `selectStatus` method might wait or we can click Search manually
    await salesReturnPage.selectStatus('Accepted').catch(() => {
       console.log('Could not select status, continuing...');
    });
    
    // Explicitly click search to trigger the intercepted API
    const searchBtn = authenticatedPage.locator('button[aria-label="Search"], button[type="submit"], button:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click({ force: true });
    }

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(3000);

    console.log('Step 4: Verifying the UI did not crash and is in a safe error state...');
    
    // We expect the UI to NOT crash into a white screen. The dropdown should still be visible.
    const statusContainer = authenticatedPage.locator('div.bootstrap-select, div.dropdown').filter({ has: authenticatedPage.locator('select[name="statusId"], select#statusId') }).first();
    await expect(statusContainer).toBeVisible({ timeout: 5000, message: 'UI crashed to white screen on 500 error' }).catch(async (e) => {
        const bodyText = await authenticatedPage.locator('body').innerText();
        if (bodyText.includes('HTTP Status 500') || !await authenticatedPage.locator('nav, header').isVisible()) {
             throw new Error('UI failed to render on 500 error (White screen crash)');
        }
        throw e;
    });

    const hasDataRow = authenticatedPage.locator('table tbody tr').first();
    const isRowVisible = await hasDataRow.isVisible().catch(() => false);
    
    if (isRowVisible) {
        console.log('Failure (State Management Bug): The UI failed to clear out stale data rows after a 500 error!');
        throw new Error('State Management Bug: Data rows still visible after 500 error response.');
    }
    
    // Unroute so it doesn't block other tests
    await authenticatedPage.unroute('**/*');
    
    // Enforce strict UX validation: ensure the simulated error didn't bleed backend jargon onto the screen
    const finalBodyText = await authenticatedPage.locator('body').innerText();
    messageValidator.verifyUserFriendlyMessage(finalBodyText);
    
    console.log('Success: UI gracefully handled the 500 error and cleared stale data.');
  });

  test('Should handle network timeouts gracefully without infinitely spinning', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    test.slow();
    const salesReturnPage = new SalesReturnOMSPage(authenticatedPage, baseURL, clientId);
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Sales Returns...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');
    await salesReturnPage.navigateToSalesReturns();

    console.log('Step 2: Intercepting backend search requests to force 504 Timeout error...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST' && (route.request().url().includes('Return') || route.request().url().includes('find'))) {
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

    console.log('Step 3: Triggering data fetch by clicking the Search button...');
    const searchBtn = authenticatedPage.locator('button[aria-label="Search"], button[type="submit"], button:has-text("Search")').first();
    if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click({ force: true });
    } else {
        // Trigger via status selection
        await salesReturnPage.selectStatus('Accepted').catch(() => {});
    }

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(3000);

    console.log('Step 4: Verifying the UI did not crash or spin infinitely...');
    
    // Check that we aren't stuck with a spinning loading indicator covering the whole page
    const spinner = authenticatedPage.locator('ion-spinner, .spinner, .loading-indicator, i.fa-spinner, i.fa-circle-notch').first();
    await expect(spinner).not.toBeVisible({ timeout: 5000, message: 'UI is stuck infinitely spinning on 504 error' }).catch((e) => {
        throw new Error('Infinite Spinner Bug: UI stuck loading indefinitely on 504 Timeout.');
    });
    
    // Unroute
    await authenticatedPage.unroute('**/*');
    
    // Enforce strict UX validation: ensure the simulated timeout didn't bleed backend jargon onto the screen
    const finalBodyText = await authenticatedPage.locator('body').innerText();
    messageValidator.verifyUserFriendlyMessage(finalBodyText);
    
    console.log('Success: UI degraded gracefully on 504 Timeout without infinite spinning.');
  });

});
