const { test, expect } = require('../../../fixtures/fixtures');
const { CancelOrderPage } = require('../../../pages/Order_Types/Sales_Order/cancelorder.page');

test.describe('Cancel Order', () => {
  test('should open an Approved sales order and cancel it', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order or fallback
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await cancelOrderPage.openOrderById(pooledOrder);
      // Ensure the order is approved before testing cancellation
      await cancelOrderPage.approveOrder();
    } else {
      console.log(`[Data Pool] Empty. Falling back to UI search.`);
      try {
        await cancelOrderPage.openTargetSalesOrder('Approved');
      } catch (err) {
        console.log('No Approved orders found in this environment. Skipping test.');
        test.skip(true, 'Data Error: No valid Approved orders found to test.');
        return;
      }
    }

    // Step 2: Test the "NO" flow (Dismiss cancellation)
    console.log('Testing "No" flow: Dismissing cancel order modal...');
    await cancelOrderPage.cancelOrder(false, false);

    let statusRow = await cancelOrderPage.getOrderStatusRow();
    await expect(statusRow).not.toContainText('Cancelled', { ignoreCase: true });

    // Step 3: Test the "YES" flow (Confirm cancellation)
    console.log('Testing "Yes" flow: Confirming cancel order...');
    await cancelOrderPage.cancelOrder(true, false);
    
    // Step 4: Verify the Order Status has been updated to Cancelled
    console.log('Verifying order status updated to Cancelled...');
    statusRow = await cancelOrderPage.getOrderStatusRow(); 
    await expect(statusRow).toContainText('Cancelled', { ignoreCase: true });
  });

  test('should open a Created sales order and cancel it', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order or fallback
    if (pooledOrder) {
      console.log(`[Data Pool] Skipping "Created" test because Shopify seeded orders are "Approved" by default.`);
      test.skip(!!pooledOrder, 'Shopify webhook orders are always Approved');
      await cancelOrderPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Falling back to UI search.`);
      try {
        await cancelOrderPage.openTargetSalesOrder('Created');
      } catch (err) {
        console.log('No Created orders found in this environment. Skipping test.');
        test.skip(true, 'Data Error: No valid Created orders found to test.');
        return;
      }
    }

    // Step 2: Test the "NO" flow (Dismiss cancellation)
    console.log('Testing "No" flow for Created order: Dismissing cancel order modal...');
    await cancelOrderPage.cancelOrder(false, true); // true for isCreatedOrder (uses dropdown)

    let statusRow = await cancelOrderPage.getOrderStatusRow();
    await expect(statusRow).not.toContainText('Cancelled', { ignoreCase: true });

    // Step 3: Test the "YES" flow (Confirm cancellation)
    console.log('Testing "Yes" flow for Created order: Confirming cancel order...');
    await cancelOrderPage.cancelOrder(true, true); 
    
    // Step 4: Verify the Order Status has been updated to Cancelled
    console.log('Verifying order status updated to Cancelled...');
    statusRow = await cancelOrderPage.getOrderStatusRow(); 
    await expect(statusRow).toContainText('Cancelled', { ignoreCase: true });
  });

  test('should open a Created order, approve it, and then cancel it', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    test.slow();
    const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order or fallback
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await cancelOrderPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Falling back to UI search.`);
      try {
        await cancelOrderPage.openTargetSalesOrder('Created');
      } catch (err) {
        console.log('No Created orders found in this environment. Skipping test.');
        test.skip(true, 'Data Error: No valid Created orders found to test.');
        return;
      }
    }

    // Step 2: Approve the order
    await cancelOrderPage.approveOrder();

    // Step 3: Test the "NO" flow (Dismiss cancellation)
    // Note: Once approved, isCreatedOrder is false because the button is now likely directly visible
    console.log('Testing "No" flow after approval: Dismissing cancel order modal...');
    await cancelOrderPage.cancelOrder(false, false); 

    let statusRow = await cancelOrderPage.getOrderStatusRow();
    await expect(statusRow).not.toContainText('Cancelled', { ignoreCase: true });

    // Step 4: Test the "YES" flow (Confirm cancellation)
    console.log('Testing "Yes" flow after approval: Confirming cancel order...');
    await cancelOrderPage.cancelOrder(true, false); 
    
    // Step 5: Verify the Order Status has been updated to Cancelled
    console.log('Verifying order status updated to Cancelled...');
    statusRow = await cancelOrderPage.getOrderStatusRow(); 
    await expect(statusRow).toContainText('Cancelled', { ignoreCase: true });
  });
});
