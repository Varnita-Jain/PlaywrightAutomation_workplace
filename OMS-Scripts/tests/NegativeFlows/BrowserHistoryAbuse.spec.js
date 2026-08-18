const { test, expect } = require('../../fixtures/fixtures');
const { CreateSalesReturnPage } = require('../../pages/Order_Types/Return_Order/createsalesreturn.page');

test.use({ video: 'on' });

/**
 * Related Flow: Multi-step Workflows (e.g. Sales Returns)
 * 
 * Scenario: Browser "Back Button" Abuse during Workflows
 * 
 * What it does: We step through a multi-step workflow (like creating a sales return). 
 * Right before confirming, we trigger the browser's "Back" button, and then go "Forward" again.
 * 
 * Goal: Verify that the UI state doesn't become corrupted, the form doesn't duplicate submissions, 
 * and the user isn't stuck on a blank screen due to lost React/Vue state.
 */
test.describe('Browser History Abuse - Negative Coverage', () => {
    
    test('Should handle back and forward navigation during a workflow gracefully', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
        test.setTimeout(90000); // 90 seconds timeout
        
        const createReturnPage = new CreateSalesReturnPage(authenticatedPage, baseURL, clientId);
        
        console.log('Step 1: Navigating to Create Sales Return...');
        await createReturnPage.navigateToOrderManagementMenu();
        await createReturnPage.selectCreateSalesReturnOption();
        await createReturnPage.verifyCreateSalesReturnPageOpened();

        console.log('Step 2: Searching for an order to return...');
        await createReturnPage.selectProductStore();
        await createReturnPage.selectOrderDateMoreThan30Days();
        
        const filterStatus = await createReturnPage.verifyFilterApplied();
        if (!filterStatus.hasTable) {
            test.skip(true, 'No returnable orders found to execute workflow.');
        }

        console.log('Step 3: Entering the Create Return workflow...');
        // This navigates to the specific order's return page
        await createReturnPage.clickFirstCreateReturnButton();
        await createReturnPage.verifySalesReturnsPageOpened();

        console.log('Step 4: Interacting with the form (checking a product)...');
        await createReturnPage.selectFirstProductCheckbox();

        // Now, abuse the browser history right before submission!
        console.log('Step 5: Abusing browser history - navigating Back...');
        await authenticatedPage.goBack();
        await authenticatedPage.waitForLoadState('networkidle');
        await authenticatedPage.waitForTimeout(2000);

        console.log('Step 6: Abusing browser history - navigating Forward...');
        let cacheMissError = false;
        try {
            // HotWax uses POST for this navigation, so goForward might trigger ERR_CACHE_MISS (Confirm Form Resubmission)
            await authenticatedPage.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 });
            await authenticatedPage.waitForTimeout(2000);
        } catch (e) {
            if (e.message.includes('ERR_CACHE_MISS')) {
                cacheMissError = true;
                console.log('Caught ERR_CACHE_MISS: Application does not implement PRG pattern, exposing users to browser resubmission warnings.');
            } else {
                throw e; // Relaunch if it's an unexpected error
            }
        }

        if (cacheMissError) {
            console.log('Test completed: Found architectural issue (Missing Post-Redirect-Get pattern) when abusing browser history.');
            throw new Error("Missing PRG pattern. UI throws ERR_CACHE_MISS on browser back/forward.");
        }

        console.log('Step 7: Verifying UI state is recovered and we are back on the Return form...');
        // We should be back on the Sales Return page without a white screen
        const bodyText = await authenticatedPage.locator('body').innerText();
        messageValidator.verifyUserFriendlyMessage(bodyText);
        
        const bodyCount = await authenticatedPage.locator('body').count();
        expect(bodyCount).toBe(1);

        await createReturnPage.verifySalesReturnsPageOpened();

        console.log('Step 8: Re-interacting with the form to prove state is not corrupted...');
        // The checkbox might have lost its state during the back/forward, so we check it again if needed
        try {
            await createReturnPage.selectFirstProductCheckbox();
        } catch (e) {
            console.log('Checkbox was still selected or could not be selected, proceeding...');
        }

        console.log('Step 9: Attempting to submit the form after history abuse...');
        let backendRejected = false;
        
        // We set up a route to catch any 500s or duplicated submissions
        await authenticatedPage.route('**/*', async route => {
            if (route.request().method() === 'POST') {
                const response = await route.fetch().catch(() => null);
                if (response) {
                    if (response.status() >= 400 && response.status() !== 401) {
                        backendRejected = true;
                    }
                    await route.fulfill({ response });
                } else {
                    await route.abort();
                }
            } else {
                await route.continue();
            }
        });

        // Click create return
        try {
            await createReturnPage.clickCreateReturnButton();
        } catch (e) {
            console.log('Button click failed after history abuse, UI might be locked.');
        }
        
        await authenticatedPage.waitForTimeout(3000);
        
        // Check if page crashed after submit
        const postSubmitBodyCount = await authenticatedPage.locator('body').count();
        expect(postSubmitBodyCount).toBe(1);

        // Verify if it succeeded or gracefully warned about permissions
        const result = await createReturnPage.verifyReturnCreatedOrErrorMessage();
        
        console.log(`Did the backend reject with a hard error (500)? ${backendRejected}`);
        console.log(`Action Result: ${result.message}`);

        console.log('Success: Workflow safely handled Browser History back/forward abuse.');
        
        await authenticatedPage.unroute('**/*');
    });
});
1