const { test, expect } = require('../../../fixtures/fixtures');
const { EditOrderItemsGroupPage } = require('../../../pages/Order_Types/Sales_Order/editorderitemsgroup.page');

test.describe('Sales Order - Edit Order Items Group', () => {
  test.describe.configure({ mode: 'serial' });
  
  test('should verify phone number deletion flow with confirmation modal', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const editPage = new EditOrderItemsGroupPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to the Sales Order Listing page
    await editPage.navigateToFindOrder();

    // Step 2: From the header filter, click on Order Status and select: Approved, Created
    await editPage.selectHeaderFilters('Order Status', ['Approved', 'Created']);

    // Step 3: From the next filter, click on Item Status and select: Completed
    await editPage.selectHeaderFilters('Item Status', ['Completed']);

    // Step 4: Select any order from the listing page and open the Order Details page
    await editPage.openFirstOrder();

    // Step 5 & 6: Locate and click the dustbin icon
    await editPage.clickDeletePhoneNumber();

    // Step 7 & 8: Verify modal text and buttons
    await editPage.verifyDeleteModal();

    // Step 9.1: If the user clicks on No, the confirmation modal should close
    await editPage.clickNoAndVerifyClosed();

    // Re-open modal for the next verification
    await editPage.clickDeletePhoneNumber();

    // Step 9.2: If the user clicks on Yes, a success confirmation message should be displayed
    await editPage.clickYesAndVerifySuccess();

    // Test Block 2: Continue with the same order and edit the shipping address
    await editPage.clickEditShippingAddress();
    await editPage.verifyEditShippingAddressModal();
    await editPage.updateShippingAddress();
    await editPage.verifyKeepLatitudeLongitudeChecked();
    await editPage.saveShippingAddress();
    await editPage.verifyUpdatedShippingAddressDisplayed();
  });

  test('should verify completed orders do not allow phone deletion or shipping address edit', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    const editPage = new EditOrderItemsGroupPage(authenticatedPage, baseURL, clientId);

    // Step 1: Navigate to the Sales Order Listing page
    await editPage.navigateToFindOrder();

    // Step 2: From the header filter, select Order Status: Completed and Item Status: Completed
    await editPage.selectHeaderFilters('Order Status', ['Completed']);
    await editPage.selectHeaderFilters('Item Status', ['Completed']);

    // Step 3: Open any order from the listing page
    await editPage.openAnyOrderFromListing();

    // Steps 4-7: Completed orders should not expose delete/edit actions or edit modal
    await editPage.verifyCompletedOrderIsNotEditable();
  });
});
