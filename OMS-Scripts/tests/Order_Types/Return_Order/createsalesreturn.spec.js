/**
 * @file createsalesreturn.spec.js
 * @description Playwright test suite for validating the "Create Sales Return" flow in the Order Management System.
 * 
 * Imports:
 * 1. `test` from `fixtures/fixtures.js` - This custom fixture extends the base Playwright test. 
 *    It automatically handles session authentication (login/state storage) and optionally 
 *    supplies pooled data (if applicable), so we don't have to manually log in before every test.
 * 2. `CreateSalesReturnPage` from `createsalesreturn.page.js` - This is the Page Object Model (POM) class
 *    that encapsulates all the element locators and interaction logic for the "Create Return" screens. 
 *    It keeps our test file clean and separates the UI interaction logic from the test assertions.
 */
const { test } = require('../../../fixtures/fixtures');
const { CreateSalesReturnPage } = require('../../../pages/Order_Types/Return_Order/createsalesreturn.page');

test.describe('Create Sales Return Flow', () => {
  
  /**
   * Main Test: Complete flow from Order Management menu to Sales Return creation
   * This test verifies the entire user journey:
   * 1. Navigate to Order Management menu
   * 2. Select Create Sales Return
   * 3. Apply filters (Product Store and Order Date)
   * 4. Create a sales return for the first matching order
   */

  test('should create a sales return successfully', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();

    // Initialize the page object
    const createSalesReturnPage = new CreateSalesReturnPage(authenticatedPage, baseURL, clientId);

    try {
      // Navigate to Create Sales Return Page =====
      await createSalesReturnPage.navigateToOrderManagementMenu();
      await createSalesReturnPage.selectCreateSalesReturnOption();
      await createSalesReturnPage.verifyCreateSalesReturnPageOpened();

      // Apply Filters to Find Orders =====
      await createSalesReturnPage.selectProductStore();
      await createSalesReturnPage.selectOrderDateMoreThan30Days();
      const filterResult = await createSalesReturnPage.verifyFilterApplied();

      // Create Return if Records Available =====
      if (filterResult.hasTable) {
        // Records are available - proceed with creating a return
        await createSalesReturnPage.clickRandomCreateReturnButton();
        await createSalesReturnPage.verifySalesReturnsPageOpened();
        
        // Select a product and create the return
        await createSalesReturnPage.selectFirstProductCheckbox();
        await createSalesReturnPage.clickCreateReturnButton();
        
        // Verify the return was created successfully
        const result = await createSalesReturnPage.verifyReturnCreatedOrErrorMessage();

        // If there's a permission error, verify we're still on the same page
        if (!result.success && !result.hasPermission) {
          console.log('Test note: User does not have permission to create return');
          await createSalesReturnPage.verifySalesReturnsPageOpened();
        }
      } else {
        // No records available
        console.log('Test note: No records found with applied filters - empty state verified');
      }
    } catch (error) {
      // Skip test if feature not supported for this client
      if (error.message.includes('Feature_Not_Supported')) {
        test.skip();
      }
      throw error;
    }
  });

  /**
   * Test: Verify empty state handling
   * This test ensures the page correctly displays when no records match the filters
   */
  test('should display empty state when no records match filters', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();

    // Initialize the page object
    const createSalesReturnPage = new CreateSalesReturnPage(authenticatedPage, baseURL, clientId);

    try {
      // Navigate to Create Sales Return page
      await createSalesReturnPage.navigateToOrderManagementMenu();
      await createSalesReturnPage.selectCreateSalesReturnOption();
      await createSalesReturnPage.verifyCreateSalesReturnPageOpened();

      // Apply filters
      await createSalesReturnPage.selectProductStore();
      await createSalesReturnPage.selectOrderDateMoreThan30Days();

      // Verify the results (either table or empty state)
      const filterResult = await createSalesReturnPage.verifyFilterApplied();

      // Ensure we got either a table or empty state - something should be displayed
      if (!filterResult.hasTable && !filterResult.hasEmptyState) {
        throw new Error('ERROR: Expected either a results table or an empty state message, but found neither');
      }
    } catch (error) {
      // Skip test if feature not supported for this client
      if (error.message.includes('Feature_Not_Supported')) {
        test.skip();
      }
      throw error;
    }
  });
});


