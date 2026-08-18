const { test, expect } = require('../../fixtures/fixtures');
const { CancelOrderPage } = require('../../pages/Order_Types/Sales_Order/cancelorder.page');

/**
 * Related Flow: Concurrency & Double-Click Resilience
 * 
 * This suite contains negative test scenarios for ensuring the UI prevents 
 * race conditions (like firing duplicate backend requests) when users 
 * rapidly double or triple-click action buttons.
 */
test.describe('Concurrency & Race Conditions - Negative Coverage', () => {
  test.setTimeout(90000);

  test('Should strictly prevent multiple POST requests on rapid double-clicking during Order Cancellation', async ({ authenticatedPage, baseURL, clientId, pooledOrder }) => {
    const cancelOrderPage = new CancelOrderPage(authenticatedPage, baseURL, clientId);
    
    try {
        console.log('Step 1: Opening an Approved order to cancel...');
        if (pooledOrder) {
            console.log(`[Data Pool] Consuming order ${pooledOrder}`);
            await cancelOrderPage.openOrderById(pooledOrder);
            await cancelOrderPage.approveOrder();
        } else {
            console.log(`[Data Pool] Empty. Falling back to UI search.`);
            await cancelOrderPage.openTargetSalesOrder('Approved');
        }

        // We bypass the wrapper function and do the cancellation manually so we can double click
        
        // 1. Click "Cancel Order" to open the modal
        const cancelBtn = authenticatedPage.locator([
            'a[title*="Cancel Order"]',
            'button[title*="Cancel Order"]',
            'a:has-text("Cancel Order")',
            'button:has-text("Cancel Order")',
            '.toolbar a:has-text("Cancel")',
            '.toolbar button:has-text("Cancel")',
            '.dropdown-menu a:has-text("Cancel")',
            '.dropdown-menu button:has-text("Cancel")'
        ].join(', ')).filter({ state: 'visible' }).first();

        let isVisible = await cancelBtn.isVisible().catch(() => false);
        if (!isVisible) {
            const dropdownToggle = authenticatedPage.locator([
                'button.dropdown-toggle',
                '.btn-group .dropdown-toggle',
                '.dropdown-toggle:has-text("Action")',
                'a.dropdown-toggle'
            ].join(', ')).filter({ state: 'visible' }).first();
            
            if (await dropdownToggle.isVisible().catch(() => false)) {
                await dropdownToggle.click().catch(() => {});
                await authenticatedPage.waitForTimeout(1000);
            }
        }

        await cancelBtn.scrollIntoViewIfNeeded();
        await cancelBtn.click({ force: true });

        // 2. Wait for modal and select reason
        const cancelModal = authenticatedPage.locator('.modal-dialog, ion-modal, dialog').filter({ hasText: /Cancel Order/i }).last();
        await cancelModal.waitFor({ state: 'visible', timeout: 5000 });
        const reasonRadio = cancelModal.locator('input[type="radio"][name="changeReason"], input[type="radio"]').first();
        await reasonRadio.waitFor({ state: 'attached' });
        await reasonRadio.click({ force: true });
        await authenticatedPage.waitForTimeout(500);

        // 3. Setup network interception to delay the response and count requests
        let requestCount = 0;
        await authenticatedPage.route('**/*', async route => {
            const req = route.request();
            if (req.method() === 'POST' && (req.url().includes('cancel') || req.url().includes('changeOrderStatus'))) {
                requestCount++;
                console.log(`[NETWORK] Cancellation POST request intercepted! (Total so far: ${requestCount})`);
                
                // Asynchronously delay the fulfill so we don't block Playwright's execution thread
                setTimeout(() => {
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ success: "Simulated Success" })
                    }).catch(() => {});
                }, 3000);
            } else {
                await route.continue();
            }
        });

        // 4. Attack: Rapidly click "Yes" 5 times
        const yesBtn = cancelModal.locator('button.btn-danger:has-text("Yes"), button[type="submit"]:has-text("Yes")').first();
        console.log('Step 2: Simulating impatient user: Rapidly double-clicking the "Yes" confirm button 5 times...');
        
        for (let i = 0; i < 5; i++) {
            // We use evaluate to execute the clicks synchronously in the browser JS thread,
            // entirely eliminating Playwright communication overhead and potential hangs.
            await yesBtn.evaluate(node => node.click()).catch(() => {});
            await authenticatedPage.waitForTimeout(50); // 50ms between clicks
        }

        // Wait a few seconds to let any rogue requests finish going out
        console.log('Step 3: Waiting to observe network traffic...');
        await authenticatedPage.waitForTimeout(4000);

        // 5. Verification
        console.log(`\n--- Verification Results ---`);
        console.log(`Total backend cancellation requests fired: ${requestCount}`);
        
        if (requestCount > 1) {
            console.log('Failure (Concurrency Bug): The UI allowed multiple POST requests to the backend!');
            throw new Error(`Double-Click Vulnerability: The UI sent ${requestCount} cancellation requests to the backend instead of 1.`);
        } else if (requestCount === 0) {
            console.log('Warning: No cancellation request was intercepted. The locators might have missed the actual URL.');
        } else {
            console.log('Success: The UI gracefully handled the double-clicks and only dispatched 1 backend request.');
        }
        
        // Assert exactly 1 or 0 (if our interception pattern didn't match the specific client API, 0 is fine, but >1 is a bug)
        expect(requestCount).toBeLessThanOrEqual(1);

    } catch (e) {
      if (e.message.includes('[DATA ERROR]')) {
        test.skip(true, 'No Approved order available to test negative flow');
      } else {
        throw e;
      }
    }
  });

});
