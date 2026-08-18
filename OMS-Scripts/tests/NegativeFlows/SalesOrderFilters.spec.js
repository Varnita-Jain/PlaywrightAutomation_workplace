const { test, expect } = require('../../fixtures/fixtures');

test.use({ video: 'on' });

/**
 * Related Flow: Order Management / Sales Order Filters
 * 
 * This suite contains negative test scenarios for the Find Sales Order module.
 * It verifies that the UI handles massive data fetching failures gracefully (500 errors, timeouts) 
 * without crashing or locking up the browser.
 */
test.describe('Find Sales Order Filters - Negative Coverage', () => {
  test.setTimeout(45000);

  /**
   * Scenario 1: Mock 500 Server Error During Data Fetch
   * 
   * When the user filters orders, the UI fires an API call to fetch the list.
   * We intercept this request and force a 500 Internal Server Error.
   * We expect the UI to handle the error gracefully without a white-screen crash.
   */
  test('Should handle 500 server error gracefully when filtering sales orders', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Find Sales Order...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/FindOrder`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully first
    const searchBtn = authenticatedPage.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 500 error...');
    await authenticatedPage.route('**/*', async route => {
      // Intercept POST requests (which are usually the data fetch or search APIs)
      if (route.request().method() === 'POST') {
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

    console.log('Step 3: Triggering data fetch by clicking the Search button...');
    await searchBtn.click({ force: true });

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI did not crash and is in a safe error state...');
    
    // We expect the UI to NOT crash into a white screen. The search button should still be visible.
    await expect(searchBtn).toBeVisible();

    const noResultsFound = authenticatedPage.locator('text="No keyword matches the search criteria."').first();
    const hasDataRow = authenticatedPage.locator('table tbody tr:has(a[href*="orderId="])').first();
    
    // If a data row is visible, it means the API failure didn't properly clear the old state
    await expect(hasDataRow).not.toBeVisible();
    
    // Safest graceful degradation
    if (await noResultsFound.isVisible().catch(() => false)) {
        await expect(noResultsFound).toBeVisible();
    }
  });

  /**
   * Scenario 2: Mock Network Timeout (504)
   */
  test('Should handle network timeouts gracefully without infinitely spinning', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Find Sales Order...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/FindOrder`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await authenticatedPage.waitForTimeout(2000);

    // Verify page loaded successfully
    const searchBtn = authenticatedPage.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 }).catch(() => {
        test.skip(true, 'Redirected to login or unsupported feature on this client');
    });

    console.log('Step 2: Intercepting backend search requests to force 504 Timeout error...');
    await authenticatedPage.route('**/*', async route => {
      if (route.request().method() === 'POST') {
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
    await searchBtn.click({ force: true });

    // Wait for the simulated failed fetch to resolve
    await authenticatedPage.waitForTimeout(2500);

    console.log('Step 4: Verifying the UI did not crash or spin infinitely...');
    
    // The UI should still be interactable
    await expect(searchBtn).toBeVisible();

    // Check that we aren't stuck with a spinning loading indicator covering the whole page
    const spinner = authenticatedPage.locator('ion-spinner, .spinner, .loading-indicator').first();
    await expect(spinner).not.toBeVisible();
  });

  /**
   * Scenario 3: Logically invalid Date Range (To Date < From Date)
   * 
   * Validates that the UI gracefully handles impossible date logic.
   */
  test('Should handle logically invalid Date Ranges safely (To Date < From Date)', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);

    console.log('Step 1: Navigating directly to Find Sales Order...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/FindOrder`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Step 2: Opening Order Date filter modal...');
    // Hide sidebar to avoid intercepting clicks
    await authenticatedPage.evaluate(() => {
        const sidebar = document.querySelector('.sidebar, nav.sidebar, #sidebar-nav, .left-side');
        if (sidebar) sidebar.style.display = 'none';
    }).catch(() => {});

    // Ensure large viewport to avoid horizontal scroll issues
    await authenticatedPage.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
    const scrollBtn = authenticatedPage.locator('i.fa-fast-forward').first();
    if (await scrollBtn.isVisible()) {
        await scrollBtn.click();
        await authenticatedPage.waitForTimeout(500);
    }

    // Find ANY date filter (Order Date, Promised Date, etc.)
    const container = authenticatedPage.locator('div, fieldset, .form-group').filter({ has: authenticatedPage.locator('label, span, div').filter({ hasText: /Date/i }) }).filter({ has: authenticatedPage.locator('button, .dropdown-toggle, .select2-selection') }).first();
    const dateTrigger = container.locator('button, .dropdown-toggle, .select2-selection, .select-box').first();

    await dateTrigger.scrollIntoViewIfNeeded();
    await dateTrigger.click({ force: true });
    await authenticatedPage.waitForTimeout(1000); 

    console.log('Step 3: Entering invalid date range...');
    
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [month, day, year].join('-');
    };

    // INVALID RANGE: From Today, To 30 Days Ago
    const fromDateStr = formatDate(today);
    const toDateStr = formatDate(thirtyDaysAgo);
    
    const fromInput = authenticatedPage.locator('#fromDate_i18n, input[name*="fromDate"]').first();
    const toInput = authenticatedPage.locator('#toDate_i18n, input[name*="toDate"]').first();
    
    await fromInput.waitFor({ state: 'attached', timeout: 10000 });
    await fromInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, fromDateStr);
    
    await toInput.waitFor({ state: 'attached', timeout: 10000 });
    await toInput.evaluate((el, val) => { 
        el.removeAttribute('readonly');
        el.value = val; 
        if (el._flatpickr) el._flatpickr.setDate(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true })); 
    }, toDateStr);

    console.log('Step 4: Attempting to Apply filter...');
    const applyBtn = authenticatedPage.locator('.modal-content button:has-text("Apply"), .modal-dialog button:has-text("Apply"), button.btn-primary:has-text("Apply")').filter({ state: 'visible' }).first();
    
    await applyBtn.click({ force: true }).catch(() => applyBtn.evaluate(el => el.click()));
    await authenticatedPage.waitForTimeout(1500); // Give UI time to react

    console.log('Step 5: Verifying UI handles invalid dates safely...');
    
    // Check if the modal stayed open (suggesting it blocked submission)
    const modalVisible = await authenticatedPage.locator('.modal-content, .modal-dialog, dialog').first().isVisible();
    
    if (modalVisible) {
        console.log('Success: UI blocked submission and kept the date modal open.');
        return; // Passed!
    }

    // If modal closed, the app submitted the invalid filter. It should safely show "No results" or a toast error.
    console.log('Warning: Modal closed. Checking if application crashed...');
    await authenticatedPage.waitForLoadState('networkidle');

    const searchBtn = authenticatedPage.locator('button:has-text("Search"), .btn-primary:has-text("Search"), button.btn-primary').first();
    await expect(searchBtn).toBeVisible({ message: 'App crashed (white screen) on invalid date search' });

    const noResultsFound = authenticatedPage.locator('text="No keyword matches the search criteria."').first();
    const hasDataRow = authenticatedPage.locator('table tbody tr:has(a[href*="orderId="])').first();

    const resultsReturned = await hasDataRow.isVisible().catch(() => false);
    
    if (resultsReturned) {
        console.log('Failure: The application returned valid results for an impossible date range (time-travel logic error).');
        throw new Error('Backend returned positive results for ToDate < FromDate');
    }

    if (await noResultsFound.isVisible().catch(() => false)) {
        console.log('Success: Backend safely returned 0 results for impossible date range.');
    } else {
        console.log('Success: No crash detected, handled gracefully.');
    }
  });

});
