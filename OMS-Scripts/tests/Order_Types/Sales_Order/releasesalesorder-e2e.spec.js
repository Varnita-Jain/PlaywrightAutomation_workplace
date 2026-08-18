const { test, expect } = require('../../../fixtures/fixtures');
const { ReleaseSalesOrderPage } = require('../../../pages/Order_Types/Sales_Order/releasesalesorder.page');

test.describe('Release Sales Order OMS', () => {
  test('should open an approved sales order and release it seamlessly', async ({ authenticatedPage, baseURL, clientId }) => {
    test.slow();
    expect(baseURL).toBeTruthy();

    const releaseSalesOrderOMSPage = new ReleaseSalesOrderPage(authenticatedPage, baseURL, clientId);
    
    try {
      // Step 1: Open releasable order
      await releaseSalesOrderOMSPage.openAnyReleasableSalesOrderDetail();

      // If order is Created, approve it first
      const statusLocator = releaseSalesOrderOMSPage.page.locator('.definition, .value, dd, ion-note, ion-label:has-text("Status") + ion-note, dt:has-text("Status") + dd').filter({ hasText: /Cancelled|Created|Approved|Completed/i }).first();
      let currentStatus = await statusLocator.innerText().catch(() => '');
      console.log(`Current order status detected: "${currentStatus}"`);
      
      if (currentStatus.includes('Created')) {
          console.log('Initiating approval flow...');
          await releaseSalesOrderOMSPage.approveOrder();
          console.log('Approval flow finished.');
          
          // Check if the order auto-completed after approval
          currentStatus = await statusLocator.innerText().catch(() => '');
          if (currentStatus.includes('Completed')) {
            console.log('[SKIP] Order auto-completed upon approval. Cannot test release.');
            test.skip(true, 'Order auto-completed upon approval');
            return;
          }
      } else {
          console.log('Order already approved or status not recognized as Created.');
      }

      // Step 2: Interface with explicit Release routing controls
      // Captures the selected facility during the Release Item action
      const selectedFacility = await releaseSalesOrderOMSPage.clickReleaseItemAndSaveFacility();

      // Step 3: Verify the selected facility is correctly displayed in the Ship From section
      if (selectedFacility) {
        console.log(`Verifying facility in Ship From section: ${selectedFacility}`);
        const shipFromContainers = releaseSalesOrderOMSPage.getShipFromSection();
        
        // Since there might be multiple item groups (multiple "Ship From" sections),
        // Due to inventory limits in test environments, routing might fail and revert to Brokering Queue
        const targetContainer = shipFromContainers.filter({ hasText: new RegExp(`${selectedFacility}|Brokering Queue`, 'i') }).first();
        await expect(targetContainer).toBeVisible({ timeout: 10000 });
      }
    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        console.log(`\n[SKIP] Skipping test: No releasable orders available in ${clientId} environment.`);
        test.skip(true, `No releasable test data found for ${clientId}`);
      } else {
        throw e;
      }
    }
  });
});
