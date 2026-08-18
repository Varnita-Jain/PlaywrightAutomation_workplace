const { test } = require('../../../fixtures/fixtures');
const { SalesReturnOMSPage } = require('../../../pages/Order_Types/Return_Order/salesreturn.page');

test.describe.serial('Sales Returns', () => {
  async function filterSalesReturnsByStatus(authenticatedPage, baseURL, clientId, status) {
    test.slow();
    
    const salesReturnPage = new SalesReturnOMSPage(authenticatedPage, baseURL, clientId);
    
    try {
      // Start by navigating to the Commerce app main page as per requirements
      const url = new URL(baseURL);
      await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
      await authenticatedPage.waitForLoadState('networkidle');

      // 1. Locate and click the "Sales Returns" option from the side menu and verify it opened
      await salesReturnPage.navigateToSalesReturns();
      
      // 2. Locate Status filter dropdown (default "Select"), click it, and select the requested status
      const selectedStatus = await salesReturnPage.selectStatus(status);
      
      // 3. Locate Facility dropdown via label, open it, and select any available option
      await salesReturnPage.selectFacility();
      
      // 4. Locate Date filter via label, open it, and select "More than 30 days" radio button
      await salesReturnPage.selectDateMoreThan30Days();
      
      // 5. Verify results table and ensure all row values in Status column match the selected status exactly
      await salesReturnPage.verifyTableResultsStatus(selectedStatus);
    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        console.log(`\n[SKIP] Skipping test: ${e.message}`);
        test.skip(true, e.message);
      } else {
        throw e;
      }
    }
  }

  test('should filter Sales Returns by Accepted status, Facility, and Date', async ({ authenticatedPage, baseURL, clientId }) => {
    await filterSalesReturnsByStatus(authenticatedPage, baseURL, clientId, 'Accepted');
  });

  test('should filter Sales Returns by Cancelled status, Facility, and Date', async ({ authenticatedPage, baseURL, clientId }) => {
    await filterSalesReturnsByStatus(authenticatedPage, baseURL, clientId, 'Cancelled');
  });

  test('should filter Sales Returns by Received status, Facility, and Date', async ({ authenticatedPage, baseURL, clientId }) => {
    await filterSalesReturnsByStatus(authenticatedPage, baseURL, clientId, 'Received');
  });
});
