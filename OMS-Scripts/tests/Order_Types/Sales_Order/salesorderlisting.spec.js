
const { test, expect } = require('../../../fixtures/fixtures');
const { SalesOrderListingPage } = require('../../../pages/Order_Types/Sales_Order/salesorderlisting.page');

test.describe('Sales Order Listing Checkbox Interactions', () => {
  
  test('should verify checkbox selection and select all functionality', async ({ authenticatedPage, baseURL, clientId }) => {
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to the Sales Order Listing page
    console.log('Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Verify rows are present
    const rowCount = await listingPage.rows.count();
    console.log(`Found ${rowCount} orders in listing.`);
    if (rowCount === 0) {
      console.log('No orders found to test checkboxes. Skipping...');
      return;
    }

    // Step 3: Select the first order and verify
    console.log('Selecting the first order...');
    await listingPage.selectOrder(0);
    expect(await listingPage.isOrderSelected(0)).toBeTruthy();
    expect(await listingPage.getSelectedCount()).toBe(1);

    // Step 4: Deselect the first order and verify
    console.log('Deselecting the first order...');
    await listingPage.deselectOrder(0);
    expect(await listingPage.isOrderSelected(0)).toBeFalsy();
    expect(await listingPage.getSelectedCount()).toBe(0);

    // Step 5: Select multiple orders
    const toSelect = Math.min(rowCount, 3);
    console.log(`Selecting first ${toSelect} orders...`);
    const indices = Array.from({ length: toSelect }, (_, i) => i);
    await listingPage.selectMultipleOrders(indices);
    expect(await listingPage.getSelectedCount()).toBe(toSelect);

    // Step 6: Test "Select All" ON
    console.log('Testing Select All ON...');
    await listingPage.toggleSelectAll(true);
    const totalSelected = await listingPage.getSelectedCount();
    expect(totalSelected).toBeGreaterThanOrEqual(toSelect);
    expect(totalSelected).toBe(rowCount);

    // Step 7: Test "Select All" OFF
    console.log('Testing Select All OFF...');
    await listingPage.toggleSelectAll(false);
    expect(await listingPage.getSelectedCount()).toBe(0);
  });

  test('Test 1: should filter by Pre-orders and verify Facility column across pagination', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow(); // Filtering and pagination can take time
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Sales Order Listing
    console.log('Step 1: Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Find and check "Pre-orders" checkbox
    console.log('Step 2: Checking "Pre-orders" facility filter...');
    await listingPage.filterByPreOrder();

    // Step 3: Verify results for Facility column on each page
    console.log('Step 3: Verifying Facility column results...');
    
    let hasNextPage = true;
    let pageCount = 1;

    while (hasNextPage) {
      console.log(`--- Verifying Page ${pageCount} ---`);
      
      // Verify current page results
      // Assuming "Pre-order Parking" is the expected facility name or contains "Pre-order"
      await listingPage.verifyFacilityColumn('Pre-order Parking');

      // Try navigating to next page
      hasNextPage = await listingPage.goToNextPage();
      if (hasNextPage) {
        pageCount++;
        // Limit to 5 pages for testing efficiency
        if (pageCount >= 5) {
            console.log('Reached 5 page limit for verification.');
            break;
        }
      }
    }

    console.log(`Verification complete across ${pageCount} pages.`);
  });

  test('Test 2: should filter by Back-orders and verify Facility column across pagination', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Sales Order Listing
    console.log('Step 1: Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Check "Back-orders" facility filter
    console.log('Step 2: Checking "Back-orders" facility filter...');
    await listingPage.filterByBackOrder();

    // Step 3: Verify Facility column results across pagination
    console.log('Step 3: Verifying Facility column results...');
    let currentPage = 1;
    const maxPagesToVerify = 5; 

    while (currentPage <= maxPagesToVerify) {
      console.log(`--- Verifying Page ${currentPage} ---`);
      await listingPage.verifyFacilityColumn('Backorder Parking');

      // Try going to next page
      const moved = await listingPage.goToNextPage();
      if (!moved) {
        console.log('No more pages to verify.');
        break;
      }
      currentPage++;
    }

    console.log('Test 2 completed successfully.');
  });

  test('Test 3: should filter by Brokering Queue and verify Facility column across pagination', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Sales Order Listing
    console.log('Step 1: Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Check "Brokering Queue" facility filter
    console.log('Step 2: Checking "Brokering Queue" facility filter...');
    await listingPage.filterByBrokeringQueue();

    // Step 3: Verify Facility column results across pagination
    console.log('Step 3: Verifying Facility column results...');
    let currentPage = 1;
    const maxPagesToVerify = 5; 

    while (currentPage <= maxPagesToVerify) {
      console.log(`--- Verifying Page ${currentPage} ---`);
      await listingPage.verifyFacilityColumn('Brokering Queue');

      // Try going to next page
      const moved = await listingPage.goToNextPage();
      if (!moved) {
        console.log('No more pages to verify.');
        break;
      }
      currentPage++;
    }

    console.log('Test 3 completed successfully.');
  });

  test('Test 4: should filter by Unfillable Hold and verify Facility column across pagination', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Sales Order Listing
    console.log('Step 1: Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Check "Unfillable Hold" facility filter
    console.log('Step 2: Checking "Unfillable Hold" facility filter...');
    await listingPage.filterByUnfillableHold();

    // Step 3: Verify Facility column results across pagination
    console.log('Step 3: Verifying Facility column results...');
    let currentPage = 1;
    const maxPagesToVerify = 5; 

    while (currentPage <= maxPagesToVerify) {
      console.log(`--- Verifying Page ${currentPage} ---`);
      await listingPage.verifyFacilityColumn('Unfillable Hold');

      // Try going to next page
      const moved = await listingPage.goToNextPage();
      if (!moved) {
        console.log('No more pages to verify.');
        break;
      }
      currentPage++;
    }

    console.log('Test 4 completed successfully.');
  });

  test('Test 5: should filter by Auto Cancel Today and verify results across pagination', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const listingPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Sales Order Listing
    console.log('Step 1: Navigating to Sales Order Listing...');
    await listingPage.navigateToFindOrder();

    // Step 2: Check "Auto Cancel Today" filter
    console.log('Step 2: Checking "Auto Cancel Today" filter...');
    await listingPage.filterByAutoCancelToday();

    // Step 3: Verify results across pagination
    console.log('Step 3: Verifying column results...');
    let currentPage = 1;
    const maxPagesToVerify = 5; 

    while (currentPage <= maxPagesToVerify) {
      console.log(`--- Verifying Page ${currentPage} ---`);
      
      // Verify Facility column (checking for any content as per instruction)
      await listingPage.verifyFacilityColumn(''); 
      
      // Also verify Auto Cancel Date column
      await listingPage.verifyAutoCancelDateColumn();

      // Try going to next page
      const moved = await listingPage.goToNextPage();
      if (!moved) {
        console.log('No more pages to verify.');
        break;
      }
      currentPage++;
    }

    console.log('Test 5 completed successfully.');
  });
});
