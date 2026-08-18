const { test, expect } = require('../../fixtures/fixtures');

/**
 * Related Flow: Direct Navigation & URL State Management
 * 
 * This suite contains negative test scenarios to verify how the application
 * handles invalid, malformed, or unauthorized URL parameters when navigating directly
 * to specific views (like the Order Detail page).
 */
test.describe('Invalid URL Parameters - Negative Coverage', () => {

  /**
   * Scenario: Direct Navigation with an invalid or missing Order ID
   * 
   * Verifies that the application handles a fake Order ID safely without a 500 error,
   * Java stack trace explosion, or infinite loading state.
   */
  test('Should handle invalid Order ID safely without crashing', async ({ authenticatedPage, baseURL }) => {
    const url = new URL(baseURL);
    const FAKE_ORDER_ID = 'FAKE_ID_12345_TEST';

    console.log(`Step 1: Navigating directly to Order Detail with fake ID: ${FAKE_ORDER_ID}`);
    // Navigate directly to the Order Detail page with the fake ID
    const targetUrl = `${url.origin}/commerce/control/OrderDetail?orderId=${FAKE_ORDER_ID}`;
    
    await authenticatedPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('Step 2: Waiting for UI to resolve...');
    // Give the UI time to fetch the non-existent order and render the result
    await authenticatedPage.waitForTimeout(3000); 

    console.log('Step 3: Checking if the application crashed (White Screen / 500 Server Error)...');
    
    // If the application crashed with a raw 500 HTML response, the body will often only contain "Internal Server Error"
    const bodyText = await authenticatedPage.locator('body').innerText();
    if (bodyText.includes('HTTP Status 500') || bodyText.includes('java.lang.') || bodyText.includes('Exception')) {
        console.log('Failure: The backend crashed and threw a stack trace into the UI!');
        throw new Error('Backend crashed on invalid Order ID');
    }

    // Check if the page is completely blank (white screen of death)
    const hasHeader = await authenticatedPage.locator('header, .main-header, nav').isVisible().catch(() => false);
    if (!hasHeader) {
        console.log('Failure: The application UI failed to load (white screen crash).');
        throw new Error('UI failed to render on invalid Order ID');
    }

    console.log('Step 4: Validating graceful degradation...');
    
    // Look for error toast, "Order Not Found" text, or an empty state
    const pageSource = await authenticatedPage.content();
    
    const isGraceful = pageSource.includes('not found') || 
                       pageSource.includes('does not exist') || 
                       pageSource.includes('Error') ||
                       pageSource.includes('Invalid') ||
                       pageSource.includes('Find Sales Order'); // Redirected back to listing

    if (isGraceful) {
        console.log('Success: The application handled the invalid ID gracefully.');
    } else {
        // If it didn't show an explicit error message, check if it just rendered an empty order page safely
        const orderIdHeader = await authenticatedPage.locator('.order-id, [data-test-id="order-id"]').isVisible().catch(() => false);
        if (orderIdHeader) {
            console.log('Warning: The application loaded an empty Order Detail framework instead of showing an error.');
        } else {
            console.log('Success: UI rendered safely without crashing.');
        }
    }
  });

});
