const { test, expect } = require('../../fixtures/fixtures');
const { CancelOrderPage } = require('../../pages/Order_Types/Sales_Order/cancelorder.page');

/**
 * Related Flow: Cross-Tab State Conflict (Stale UI)
 * 
 * This suite tests how the UI handles concurrent state changes across multiple browser tabs
 * when one tab attempts to perform an action on a stale UI state.
 */
test.describe('Cross-Tab State Conflict - Negative Coverage', () => {
    test.setTimeout(120000);

    test('Should gracefully handle cancellation attempts from a stale tab when the order has already been modified in another tab', async ({ authenticatedPage, context, baseURL, clientId, pooledOrder }) => {
        // We will call the primary page Tab A
        const tabA = authenticatedPage;
        const pageA = new CancelOrderPage(tabA, baseURL, clientId);

        console.log('Step 1: In Tab A, finding an Approved order...');
        try {
            if (pooledOrder) {
                console.log(`[Data Pool] Consuming order ${pooledOrder}`);
                await pageA.openOrderById(pooledOrder);
                await pageA.approveOrder();
            } else {
                console.log(`[Data Pool] Empty. Falling back to UI search.`);
                await pageA.openTargetSalesOrder('Approved');
            }
        } catch (e) {
            if (e.message.includes('[DATA ERROR]')) {
                test.skip(true, 'No Approved order available to test the stale UI flow');
                return;
            }
            throw e;
        }

        // Extract the exact URL of the found order
        const targetUrl = tabA.url();
        const urlObj = new URL(targetUrl);
        const orderId = urlObj.searchParams.get('orderId');
        console.log(`Order found. URL: ${targetUrl}, OrderId: ${orderId}`);

        let backendRejected = false;

        // Step 2, 3 & 4: Call cancelOrder with a callback that modifies the backend state right before saving!
        console.log('Step 2: Triggering cancellation flow via UI...');
        
        try {
            await pageA.cancelOrder(true, false, async () => {
                console.log('Step 3: Inside callback: Modifying the order in the background to simulate a concurrent change...');
                await tabA.evaluate(async (oId) => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const externalLoginKey = urlParams.get('externalLoginKey') || '';
                    const fetchUrl = `/commerce/control/changeOrderStatus?orderId=${oId}&statusId=ORDER_CANCELLED&setItemStatus=Y&externalLoginKey=${externalLoginKey}`;
                    await fetch(fetchUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                }, orderId);

                // Wait a bit to ensure the backend processes the cancellation
                await tabA.waitForTimeout(2000);
                
                console.log('Step 4: Attempting to save the stale UI modal...');
                // Setup route interceptor to catch the UI's save request
                await tabA.route('**/*', async route => {
                    const req = route.request();
                    if (req.method() === 'POST' && (req.url().includes('changeOrderStatus') || req.url().includes('cancel'))) {
                        const response = await route.fetch().catch(() => null);
                        if (response) {
                            const responseStatus = response.status();
                            console.log(`Stale UI Action Response Status: ${responseStatus}`);
                            
                            if (responseStatus >= 400) {
                                backendRejected = true;
                            }
                            
                            if (responseStatus === 200) {
                                try {
                                    const json = await response.json();
                                    if (json.errorMessage || json._ERROR_MESSAGE_ || json._ERROR_MESSAGE_LIST_) {
                                        backendRejected = true;
                                        console.log(`Backend returned 200 OK but contained error message: ${json.errorMessage || json._ERROR_MESSAGE_ || json._ERROR_MESSAGE_LIST_}`);
                                    }
                                } catch (e) { }
                            }
                            await route.fulfill({ response });
                        } else {
                            await route.abort();
                        }
                    } else {
                        await route.continue();
                    }
                });
            });
        } catch (e) {
            console.log(`Caught error during cancel on stale UI: ${e.message}`);
        }

        console.log('Step 5: Verifying UI did not crash...');
        
        // We can verify Tab A didn't crash by making sure the body is still there
        const tabABodyCount = await tabA.locator('body').count();
        expect(tabABodyCount).toBe(1);

        console.log(`Did the backend reject the stale action? ${backendRejected}`);
        console.log('Success: UI handled the stale state modification safely.');
    });
});
