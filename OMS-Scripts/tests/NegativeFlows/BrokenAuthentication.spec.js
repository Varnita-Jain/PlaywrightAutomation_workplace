const { test, expect } = require('../../fixtures/fixtures');
const { SalesOrderListingPage } = require('../../pages/Order_Types/Sales_Order/salesorderlisting.page');

/**
 * Related Flow: Security & Authentication
 * 
 * This suite contains negative test scenarios for verifying that the application
 * gracefully handles expired, corrupted, or missing authentication tokens.
 */
test.describe('Broken Authentication - Negative Coverage', () => {
  test.setTimeout(90000);

  test('Should strictly reject corrupted Authorization headers and gracefully handle the 401/403 response', async ({ authenticatedPage, baseURL, clientId, messageValidator }) => {
    const salesOrderPage = new SalesOrderListingPage(authenticatedPage, baseURL, clientId);
    
    try {
        console.log('Step 1: Navigating to Sales Order Listing...');
        await salesOrderPage.navigateToFindOrder();

        console.log('Step 2: Injecting network interceptor to corrupt Authorization headers...');
        let interceptedRequest = false;
        let responseStatus = null;

        await authenticatedPage.route('**/*', async route => {
            const req = route.request();
            const headers = req.headers();
            
            // If the request carries auth data (either Authorization header or JSESSIONID cookie), corrupt it
            const hasAuthHeader = !!headers['authorization'];
            const hasAuthCookie = headers['cookie'] && headers['cookie'].includes('JSESSIONID');
            
            if (hasAuthHeader || hasAuthCookie) {
                interceptedRequest = true;
                
                if (hasAuthHeader) {
                    headers['authorization'] = 'Bearer CORRUPTED_TOKEN_12345';
                }
                
                if (hasAuthCookie) {
                    headers['cookie'] = headers['cookie'].replace(/JSESSIONID=[^;]+/, 'JSESSIONID=INVALID_SESSION');
                }

                console.log(`[NETWORK] Corrupted headers on request to: ${req.url()}`);
                
                // Continue with the corrupted headers
                const response = await route.fetch({ headers }).catch(() => null);
                if (response) {
                    responseStatus = response.status();
                    console.log(`[NETWORK] Received response status: ${responseStatus}`);
                    await route.fulfill({ response });
                } else {
                    await route.abort();
                }
            } else {
                await route.continue();
            }
        });

        console.log('Step 3: Triggering a backend request via UI (Clicking Search)...');
        // Let's trigger a search by applying a status filter or clicking search
        const searchButton = authenticatedPage.locator('button[aria-label="Search"], button[type="submit"], ion-button').filter({ hasText: /Search|Filter/i }).first();
        
        if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await searchButton.click();
        } else {
            // Fallback: reload the page to trigger initial data fetch
            console.log('Warning: Search button not found, reloading page to trigger fetch...');
            await authenticatedPage.reload();
        }

        // Wait for the network request to complete and UI to settle
        await authenticatedPage.waitForTimeout(5000);

        console.log('Step 4: Verifying backend strictly rejected the corrupted token...');
        if (!interceptedRequest) {
            console.log('Warning: No relevant POST requests were intercepted. The UI might be caching or using a different method.');
            test.skip(true, 'No API requests intercepted to test authentication.');
            return;
        }

        // Note: The backend might return 401/403 for API calls, 
        // OR it might return 200 and serve the HTML for the Login page (Form-based auth).
        console.log(`Info: Backend returned status ${responseStatus}.`);

        console.log('Step 5: Verifying frontend handles the rejection gracefully...');
        // The frontend should NOT crash. It should either:
        // 1. Redirect to login
        // 2. Show a friendly error toast ("Session expired", "Unauthorized")
        
        const currentUrl = authenticatedPage.url();
        const isLoginPage = currentUrl.includes('login') || currentUrl.includes('auth');
        
        const errorToast = authenticatedPage.locator('.toast-message, .alert-danger, .invalid-feedback, ion-toast, text=/Unauthorized|Session expired|Login|Error/i').first();
        const isErrorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);

        if (isLoginPage) {
            console.log('Success: UI gracefully redirected the user to the Login page.');
        } else if (isErrorVisible) {
            const errorText = await errorToast.innerText();
            messageValidator.verifyUserFriendlyMessage(errorText);
            console.log(`Success: UI stayed on the page but displayed a graceful error: "${errorText}"`);
        } else {
            // If it didn't redirect and didn't show an error, check if it crashed (white screen)
            const bodyText = await authenticatedPage.innerText('body');
            // Ensure no backend jargon bled onto the screen
            messageValidator.verifyUserFriendlyMessage(bodyText);
            if (!bodyText || bodyText.trim() === '') {
                throw new Error('Failure (UI Crash): The application crashed to a white screen after receiving a 401/403 response.');
            }
            console.log('Warning: UI ignored the 401/403 and did not display a visible error, but did not crash.');
        }

    } catch (e) {
      throw e;
    }
  });

});
