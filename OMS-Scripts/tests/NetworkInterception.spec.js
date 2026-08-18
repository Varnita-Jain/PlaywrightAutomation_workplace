const { test, expect } = require('../fixtures/fixtures');

test.describe('Network Interception & Assertion', () => {

  test('should intercept and verify the status of a real API response', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running Network Interception Test for: ${clientId} ===`);

    const url = new URL(baseURL);

    // 1. Set up the interception BEFORE taking the action.
    // For this example, we will wait for the main document request to succeed
    const apiResponsePromise = authenticatedPage.waitForResponse(response => 
        response.url().includes('/commerce/control/main') && 
        response.status() === 200
    );

    // 2. Trigger the action that causes the network request (navigating to the page)
    console.log('Navigating to Commerce Console to trigger API requests...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);

    // 3. Wait for the API response to come back from the real server
    const apiResponse = await apiResponsePromise;

    // 4. Extract data from the real response
    const status = apiResponse.status();
    const endpoint = apiResponse.url();
    
    console.log(`Intercepted real API request to: ${endpoint}`);
    console.log(`Real Server Response Status: ${status}`);

    // You can also read the real JSON body sent back by the server!
    try {
        const responseBody = await apiResponse.json();
        console.log(`Real Response Body Snippet:`, JSON.stringify(responseBody).substring(0, 150) + '...');
    } catch (e) {
        console.log('Response was not JSON format.');
    }

    // 5. Assert that the REAL backend is healthy and returned a 200 OK
    expect(status).toBe(200);
    // You could also assert on the body: expect(responseBody.success).toBe(true);
  });

});
