const { test, expect } = require('../../../fixtures/fixtures');
const { SalesOrderBrokerPage } = require('../../../pages/Order_Types/Sales_Order/salesorder_brokernow.page');

test.describe('Sales Order Broker Now Flow', () => {
  test('should find an approved sales order in brokering queue and broker it', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    test.slow();
    expect(baseURL).toBeTruthy();

    const brokerPage = new SalesOrderBrokerPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await brokerPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Skipping test as it requires seeded data.`);
      test.skip();
      return;
    }

    // Step 2: Perform Broker Now action
    await brokerPage.clickBrokerAndSave();
  });
});
