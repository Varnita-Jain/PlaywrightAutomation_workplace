const { test, expect } = require('../../../fixtures/fixtures');
const { RejectSalesOrderItemPage } = require('../../../pages/Order_Types/Sales_Order/rejectsalesorderitem.page');

test.describe('Reject Sales Order Item', () => {
  test('should open an approved sales order and reject an item', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    test.slow();
    expect(baseURL).toBeTruthy();

    const rejectSalesOrderPage = new RejectSalesOrderItemPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order or fallback
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await rejectSalesOrderPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Skipping test as it requires seeded data.`);
      test.skip();
      return;
    }

    // Step 2: Ensure order is brokered so Reject button is available
    await rejectSalesOrderPage.ensureOrderIsBrokered();

    // Step 3: Execute Reject Item
    await rejectSalesOrderPage.clickRejectItemAndSaveReason();
  });
});
