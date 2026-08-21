const { test, expect } = require('../../fixtures/fixtures');
const { CancelOrderPage } = require('../../pages/Order_Types/Sales_Order/cancelorder.page');

/**
 * Related Flow: Sales Order Cancellation
 * 
 * This suite contains negative test scenarios to ensure the Cancel Order flow
 * gracefully handles API failures and properly enforces status-based business logic 
 * (e.g., blocking cancellation of already completed orders).
 */
test.describe.serial('Cancel Order OMS - Negative Coverage', () => {

  /**
   * Scenario 1: Network API Error Handling - Mock 500 Server Error
   * 
   * Opens an 'Approved' order and attempts to cancel it. When the user confirms the cancellation,
   * we intercept the POST request to the backend and force a 500 Internal Server Error.
   * We verify that the UI handles this and the order status remains 'Approved'.
   */
  test('Should handle 500 server error gracefully during cancellation', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);

    try {
      console.log('Step 1: Opening an Approved order...');
      if (pooledOrder) {
        console.log(`[Data Pool] Consuming order ${pooledOrder}`);
        await cancelOrderPage.openOrderById(pooledOrder);
        await cancelOrderPage.approveOrder();
      } else {
        console.log(`[Data Pool] Empty. Falling back to UI search.`);
        await cancelOrderPage.openTargetSalesOrder('Approved');
      }

      // Intercept the POST request that fires when confirming the cancellation
      console.log('Step 2: Intercepting network to simulate 500 Error on cancellation...');
      await authenticatedPage.route('**/*', async route => {
        if (route.request().method() === 'POST' && (route.request().url().includes('cancel') || route.request().url().includes('changeOrderStatus'))) {
          console.log(`Intercepted cancellation POST request to: ${route.request().url()}`);
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: "Simulated 500 Internal Server Error during cancellation" })
          });
        } else {
          await route.continue();
        }
      });

      console.log('Step 3: Triggering "Yes" confirmation flow...');
      // Confirm cancellation (this clicks Yes, waits, and then reloads the page to check status)
      await cancelOrderPage.cancelOrder(true, false);

      console.log('Step 4: Verifying order status did NOT change to Cancelled...');
      await authenticatedPage.waitForTimeout(2000); // Wait a bit for page to render after reload
      await authenticatedPage.screenshot({ path: 'error-screenshot.png', fullPage: true });
      const statusRow = await cancelOrderPage.getOrderStatusRow();
      
      // The status should NOT be Cancelled because our 500 error blocked the backend update
      await expect(statusRow).not.toContainText('Cancelled', { ignoreCase: true });
      await expect(statusRow).toContainText('Approved', { ignoreCase: true });

      // Unroute to clean up
      await authenticatedPage.unroute('**/*');
      console.log('Success: 500 Error prevented cancellation gracefully.');

    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        test.skip(true, 'No Approved order available to test negative flow');
      } else {
        throw e;
      }
    }
  });

  /**
   * Scenario 2: Enforcing Business Logic
   * 
   * Attempts to open an order with the statuses 'Shipped', 'Fulfilled', and 'Completed'.
   * Verifies that the UI correctly hides or disables the "Cancel Order" action.
   */
  const uncancelableStatuses = ['Shipped', 'Fulfilled', 'Completed'];
  
  for (const status of uncancelableStatuses) {
    test(`Should strictly prevent canceling a ${status} order`, async ({ authenticatedPage, baseURL, clientId }) => {
      const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);

      try {
        console.log(`Step 1: Opening a ${status} order...`);
        await cancelOrderPage.openTargetSalesOrder(status);

        console.log(`Step 2: Verifying Cancel button is strictly unavailable for ${status}...`);
        
        // Look for any variation of the cancel button
        const cancelBtn = authenticatedPage.locator([
          'a[title*="Cancel Order"]',
          'button[title*="Cancel Order"]',
          'a:has-text("Cancel Order")',
          'button:has-text("Cancel Order")',
          '.toolbar a:has-text("Cancel")',
          '.toolbar button:has-text("Cancel")'
        ].join(', ')).filter({ state: 'visible' }).first();

        // Expect the button to NOT be visible
        await expect(cancelBtn).not.toBeVisible({ timeout: 5000 });
        console.log(`Success: Cancel button is correctly hidden for ${status} orders.`);

      } catch (e) {
        if (e.message.includes('[DATA ERROR]')) {
          test.skip(true, `No ${status} order available to test negative flow`);
        } else {
          throw e;
        }
      }
    });
  }

});
