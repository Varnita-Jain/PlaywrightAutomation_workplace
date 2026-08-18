const { test, expect } = require('../../../fixtures/fixtures');
const { ReleaseSalesOrderPage } = require('../../../pages/Order_Types/Sales_Order/releasesalesorder.page');

test.describe('Release Sales Order', () => {
  test('should open an approved sales order and release it seamlessly', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    test.skip(true, 'Requires API brokering logic in Data Pooler');
    test.slow();
    expect(baseURL).toBeTruthy();

    const releaseSalesOrderPage = new ReleaseSalesOrderPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await releaseSalesOrderPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Skipping test as it requires seeded data.`);
      test.skip();
      return;
    }

    // Step 2: Ensure order is brokered so items can be released
    await releaseSalesOrderPage.ensureOrderIsBrokered();

    // Step 3: Execute Release Item
    const selectedFacility = await releaseSalesOrderPage.clickReleaseItemAndSaveFacility();

    // Step 3: Verify the selected facility is correctly displayed in the Ship From section
    if (selectedFacility) {
      console.log(`Verifying facility in Ship From section: ${selectedFacility}`);
      await releaseSalesOrderPage.page.reload();
      await releaseSalesOrderPage.page.waitForLoadState('networkidle');
      const shipFromContainer = releaseSalesOrderPage.getShipFromSection();
      await expect(shipFromContainer.filter({ hasText: new RegExp(selectedFacility, 'i') }).first()).toBeVisible();
    }
  });
});
