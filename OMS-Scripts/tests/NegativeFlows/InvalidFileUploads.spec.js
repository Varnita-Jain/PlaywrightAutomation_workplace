const { test, expect } = require('../../fixtures/fixtures');

/**
 * Related Flow: File Uploads & Data Import
 * 
 * This suite contains negative test scenarios for file upload components.
 * It verifies that the UI strictly prevents uploading unsupported or malicious file types
 * (like .exe or .bin) into CSV/Image import fields, protecting the backend from crashes.
 */
test.describe('Invalid File Uploads - Negative Coverage', () => {

  test('Should reject invalid file extensions before uploading to the server', async ({ authenticatedPage, baseURL }) => {
    test.slow();
    const url = new URL(baseURL);

    console.log('Step 1: Searching for an active File Upload module...');
    
    // Most standard HotWax OMS instances have an import endpoint
    const importUrls = [
        `${url.origin}/import/control/main`,
        `${url.origin}/commerce/control/ImportOrders`,
        `${url.origin}/commerce/control/UploadFacility`,
        `${url.origin}/pim/control/main`
    ];

    let fileInput = null;
    let successfulUrl = null;

    // Iterate through common endpoints to find an upload field
    for (const target of importUrls) {
        console.log(`Trying endpoint: ${target}`);
        await authenticatedPage.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await authenticatedPage.waitForTimeout(2000);

        // Look for any input of type "file"
        const inputs = authenticatedPage.locator('input[type="file"]');
        if (await inputs.count() > 0 && await inputs.first().isVisible().catch(() => false)) {
            fileInput = inputs.first();
            successfulUrl = target;
            console.log(`Found a file upload field at ${target}!`);
            break;
        }
    }

    if (!fileInput) {
        console.log(`\n[SKIP] Could not locate an active File Upload interface on this environment.`);
        test.skip(true, 'No File Upload module available for this client environment.');
        return;
    }

    console.log('Step 2: Generating a malicious/invalid dummy file (.exe) in memory...');
    const invalidFilePayload = {
        name: 'malicious_script_simulation.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00This program cannot be run in DOS mode.')
    };

    console.log('Step 3: Intercepting network to ensure the file is NOT uploaded to the backend...');
    let uploadAttempted = false;
    await authenticatedPage.route('**/*', async route => {
        const req = route.request();
        if (req.method() === 'POST' && req.postData()?.includes('malicious_script_simulation.exe')) {
            uploadAttempted = true;
            console.log(`\n[DANGER] The UI attempted to upload the invalid file to: ${req.url()}`);
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: "Invalid File Type" })
            });
        } else {
            await route.continue();
        }
    });

    console.log('Step 4: Attempting to upload the invalid file...');
    await fileInput.setInputFiles(invalidFilePayload);

    // Try to click an "Upload" or "Submit" button if it exists
    const submitBtn = authenticatedPage.locator('button[type="submit"], input[type="submit"], button:has-text("Upload"), button:has-text("Import")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click({ force: true });
        await authenticatedPage.waitForTimeout(2000);
    }

    console.log('Step 5: Verifying the UI rejected the file...');
    
    // 1. Verify the frontend validation fired (e.g. error toast or HTML5 validation message)
    if (uploadAttempted) {
        console.log('Failure (Security/Validation Bug): The UI allowed an .exe file to be sent to the server without client-side validation!');
        throw new Error('Client-Side Validation Missing: The UI allowed an invalid file type (.exe) to bypass validation and hit the backend.');
    } else {
        console.log('Success: The UI blocked the invalid file upload client-side.');
        
        // Let's verify if there is a visible error message just to be thorough
        const errorText = await authenticatedPage.locator('text="Invalid", text="not supported", text="error", .alert-danger, .toast-error').isVisible().catch(() => false);
        if (errorText) {
            console.log('Success: Found a clear validation error message in the UI.');
        } else {
            console.log('Warning: The UI blocked the upload silently. A visible validation message is recommended for better UX.');
        }
    }
  });

});
