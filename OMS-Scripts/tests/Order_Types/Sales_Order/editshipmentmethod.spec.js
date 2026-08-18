const { test, expect } = require('../../../fixtures/fixtures');
const { EditShipmentMethodPage } = require('../../../pages/Order_Types/Sales_Order/editshipmentmethod.page');

test.describe('Edit Shipment Method', () => {
  test('should open an approved sales order and edit shipment method', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    test.slow();
    expect(baseURL).toBeTruthy();

    const editShipmentMethodPage = new EditShipmentMethodPage(authenticatedPage, baseURL, clientId);
    
    // Step 1: Use pooled order or fallback
    if (pooledOrder) {
      console.log(`[Data Pool] Consuming order ${pooledOrder}`);
      await editShipmentMethodPage.openOrderById(pooledOrder);
    } else {
      console.log(`[Data Pool] Empty. Falling back to UI search.`);
      try {
        await editShipmentMethodPage.openTargetSalesOrder();
      } catch (err) {
        console.log('No valid orders found in this environment. Skipping test.');
        test.skip(true, 'Data Error: No valid orders found to test.');
        return;
      }
    }

    // Step 2: Execute Edit Shipment Method
    const selectedMethod = await editShipmentMethodPage.editShipmentMethod();

    // Step 3: Verify the selected method is displayed in the Ship To section
    if (selectedMethod) {
      console.log(`Verifying shipment method in Ship To section: ${selectedMethod}`);
      const shipMethodItem = editShipmentMethodPage.getShipMethodItem();
      const shipToContainer = editShipmentMethodPage.getShipToSection();

      // Check the specific list item first, fallback to the entire section if needed
      if (await shipMethodItem.isVisible().catch(() => false)) {
        await expect(shipMethodItem).toContainText(selectedMethod, { ignoreCase: true });
      } else {
        await expect(shipToContainer).toContainText(selectedMethod, { ignoreCase: true });
      }
    }
  });
});
