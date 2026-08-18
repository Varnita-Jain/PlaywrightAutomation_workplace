const { test, expect } = require('../../../fixtures/fixtures');
const { FiltersOMSPage } = require('../../../pages/Order_Types/Sales_Order/filters.page');

test.describe('Sales Order Filters', () => {

  test('should verify sales order search filters', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(60000);
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Filter by the first available Product Store
    const selectedStore = await filtersPage.selectFirstProductStore();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by "${selectedStore}": ${results}`);

    if (results) {
      // Verify results match the selected store using the page object method
      await filtersPage.verifyStoreResults(selectedStore);
      console.log('Verification successful: Search results are valid for the selected store.');
    } else {
      console.warn(`No orders found for the selected store: ${selectedStore}`);
    }
  });

  test('should verify sales order search filters by Facility', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(60000);
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Filter by the first available Facility
    const selectedFacility = await filtersPage.selectFirstFacility();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by "${selectedFacility}": ${results}`);

    if (results) {
      // Verify Facility column in table matches
      await filtersPage.verifyFacilityResults(selectedFacility);
      console.log('Verification successful: Results match the selected facility.');
    } else {
      console.warn(`No orders found for the selected facility: ${selectedFacility}`);
    }
  });

  test('should verify sales order search filters by Order Status', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(60000);
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Filter by the first available Order Status
    const selectedStatus = await filtersPage.selectFirstOrderStatus();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by "${selectedStatus}": ${results}`);

    if (results) {
      // Verify results match the selected status
      await filtersPage.verifyOrderStatusResults(selectedStatus);
      console.log('Verification successful: Results match the selected status.');
    } else {
      console.warn(`No orders found for the selected status: ${selectedStatus}`);
    }
  });

  test('should verify sales order search filters by Item Status', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(60000);
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Filter by the first available Item Status
    const selectedStatus = await filtersPage.selectFirstItemStatus();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by "${selectedStatus}": ${results}`);

    if (results) {
      // Verify results match the selected item status
      await filtersPage.verifyItemStatusResults(selectedStatus);
      console.log('Verification successful: Results match the selected item status.');
    } else {
      console.warn(`No orders found for the selected item status: ${selectedStatus}`);
    }
  });

  test('should verify sales order search filters by Sales Channel', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(60000);
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Filter by the first available Sales Channel
    const selectedChannel = await filtersPage.selectFirstSalesChannel();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by "${selectedChannel}": ${results}`);

    if (results) {
      // Verify results match the selected sales channel using the page object method
      await filtersPage.verifySalesChannelResults(selectedChannel);
      console.log('Verification successful: Search results are valid for the selected sales channel.');

      // Step 4: Open the first order and verify Bill From on details page
      await filtersPage.clickFirstOrder();
      await filtersPage.verifyBillFromChannel(selectedChannel);
    } else {
      console.warn(`No orders found for the selected sales channel: ${selectedChannel}`);
    }
  });

  test('should verify sales order search filters by Order Date', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(90000); // Higher timeout for date modal interactions
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Navigate to Find Sales Order page
    await filtersPage.navigateToFindOrder();

    // Step 2: Set Order Date range (-60 days to Today)
    const { fromDate, toDate } = await filtersPage.selectOrderDateRange();

    // Step 3: Verify results are updated
    const results = await filtersPage.resultsFound();
    console.log(`Results found after filtering by date range: ${results}`);
    
    if (results) {
        // Verify results fall within the selected date range
        await filtersPage.verifyOrderDateResults(fromDate, toDate);
        console.log('Verification successful: Results are within the selected date range.');
    } else {
        console.warn('No orders found for the selected date range.');
    }
  });
  test('should verify sales order search filters by Promised Date', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(90000); 
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);
    
    await filtersPage.navigateToFindOrder();

    // Select Promised Date range (Today to Today + 30 days)
    const { fromDate, toDate } = await filtersPage.selectPromisedDateRange();

    // Verify results
    if (await filtersPage.resultsFound()) {
      await filtersPage.verifyPromisedDateResults(fromDate, toDate);
    } else {
      console.log('No records found for the selected Promised Date range.');
    }
  });
  test('should verify sales order search filters by Auto Cancel Date', async ({ authenticatedPage, baseURL, clientId }) => {
    test.setTimeout(90000); 
    const filtersPage = new FiltersOMSPage(authenticatedPage, baseURL, clientId);
    
    await filtersPage.navigateToFindOrder();

    // Select Auto Cancel Date range (Today to Today + 90 days)
    const { fromDate, toDate } = await filtersPage.selectAutoCancelDateRange();

    // Verify results
    if (await filtersPage.resultsFound()) {
      await filtersPage.verifyAutoCancelDateResults(fromDate, toDate);
    } else {
      console.log('No records found for the selected Auto Cancel Date range.');
    }
  });

});
