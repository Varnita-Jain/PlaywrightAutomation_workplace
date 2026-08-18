const { test, expect } = require('../../fixtures/fixtures');
const { RejectSalesOrderItemPage } = require('../../pages/Order_Types/Sales_Order/rejectsalesorderitem.page');

test.describe('Zero-Item Order Generation - Negative Coverage', () => {

    test('Should handle an order safely when all of its items are rejected', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
        test.setTimeout(120000);
        const omsPage = new RejectSalesOrderItemPage(authenticatedPage, baseURL, clientId);

        console.log('Step 1: Navigating to find an approved order...');
        if (pooledOrder) {
            console.log(`[Data Pool] Consuming order ${pooledOrder}`);
            await omsPage.openOrderById(pooledOrder);
        } else {
            console.log(`[Data Pool] Empty. Falling back to UI search.`);
            try {
                await omsPage.openSalesOrderByFilter({ status: 'Approved' });
            } catch (e) {
                console.log('No Approved order found, trying Created...');
                try {
                    await omsPage.openSalesOrderByFilter({ status: 'Created' });
                } catch (err) {
                    console.log('No Approved or Created orders found in this environment. Skipping test.');
                    test.skip(true, 'Data Error: No valid orders found to test.');
                    return;
                }
            }
        }

        // Wait and approve if it's currently created
        const currentStatus = await authenticatedPage.locator('.definition, .value, dd, ion-note, ion-label:has-text("Status") + ion-note, dt:has-text("Status") + dd').filter({ hasText: /Cancelled|Created|Approved/i }).first().innerText().catch(() => '');
        if (currentStatus.includes('Created')) {
            await omsPage.approveOrder();
        }

        console.log('Step 2: Checking the number of items and rejecting all of them...');
        
        let rejectButtons = authenticatedPage.locator('a:has-text("Reject Item"), button:has-text("Reject Item"), [title="Reject Item"]');
        let buttonCount = await rejectButtons.count();
        
        if (buttonCount === 0) {
            console.log('Order already has no rejectable items. Finding another order or skipping.');
            test.skip();
            return;
        }

        console.log(`Found ${buttonCount} rejectable items. Rejecting all of them...`);
        
        // Loop and reject items until none are left
        while (buttonCount > 0) {
            console.log(`Rejecting an item... (${buttonCount} left)`);
            await omsPage.clickRejectItemAndSaveReason();
            
            // After page reload in clickRejectItemAndSaveReason, re-evaluate button count
            rejectButtons = authenticatedPage.locator('a:has-text("Reject Item"), button:has-text("Reject Item"), [title="Reject Item"]');
            buttonCount = await rejectButtons.count();
        }

        console.log('Step 3: All items rejected. Order is now a Zero-Item Order shell.');
        
        console.log('Step 4: Validating how the application handles this state...');
        
        // Check for 500 error on the page
        const bodyText = await authenticatedPage.locator('body').innerText();
        expect(bodyText).not.toContain('HTTP Status 500');
        expect(bodyText).not.toContain('NullPointerException');

        // Check if the order status safely transitioned to Cancelled, or if it stayed Approved but handles being empty safely.
        const statusLocator = authenticatedPage.locator('.definition, .value, dd, ion-note, ion-label:has-text("Status") + ion-note, dt:has-text("Status") + dd').filter({ hasText: /Cancelled|Created|Approved/i }).first();
        const finalStatus = await statusLocator.innerText().catch(() => 'Unknown');
        
        console.log(`Order status is now: ${finalStatus}`);
        
        if (finalStatus.includes('Cancelled')) {
             console.log('Success: OMS correctly transitioned the zero-item order to Cancelled state.');
        } else {
             console.log('Note: Order remained open but did not crash. This is safe, though perhaps a business logic warning.');
             // Try to click Release if it exists, to see if we can release a 0-item order
             const releaseBtn = authenticatedPage.locator('a:has-text("Release Item"), button:has-text("Release")').first();
             if (await releaseBtn.isVisible()) {
                 console.log('Attempting to release the 0-item order to see if backend catches it...');
                 await releaseBtn.click();
                 // Wait to see if error modal or toast appears instead of crashing
                 await authenticatedPage.waitForTimeout(2000);
                 const newBodyText = await authenticatedPage.locator('body').innerText();
                 expect(newBodyText).not.toContain('HTTP Status 500');
             }
        }
        
        console.log('Test completed successfully: Zero-Item Orders do not cause application crashes.');
    });

});
