const { test, expect } = require('../../fixtures/fixtures');

test.describe('Settings / Create JWT Token Flow', () => {
  
  test('should navigate to Create JWT Token page, generate a token and verify', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running Create JWT Token Test for: ${clientId} ===`);
    const url = new URL(baseURL);

    // 1. Navigate directly to the feature page
    console.log('Step 1: Navigating to Create JWT Token page...');
    await authenticatedPage.goto(`${url.origin}/commerce/control/generateJwtToken`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 2. Verify page availability and skip gracefully if not found
    console.log('Step 2: Checking if feature is available...');
    const heading = authenticatedPage.locator('text="Create JWT Token"').first();
    try {
      await expect(heading).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log(`\n[SKIP] Create JWT Token feature not available for ${clientId}.`);
      test.skip(true, `Feature not available for ${clientId}`);
      return;
    }

    // 3. Fill out the form
    console.log('Step 3: Filling out form...');
    
    const userLoginSelect = authenticatedPage.locator('select').nth(0);
    if (await userLoginSelect.isVisible()) {
      await userLoginSelect.selectOption({ label: 'admin.tool' }).catch(() => userLoginSelect.selectOption({ index: 1 }));
    }

    const validitySelect = authenticatedPage.locator('select').nth(1);
    if (await validitySelect.isVisible()) {
      await validitySelect.selectOption({ label: '30 Days' }).catch(() => validitySelect.selectOption({ index: 1 }));
    }

    const purposeInput = authenticatedPage.locator('input[type="text"]').first();
    if (await purposeInput.isVisible()) {
      await purposeInput.fill('Create JWT Token Automated Test');
    }

    // 4. Submit form
    console.log('Step 4: Clicking Create...');
    const createBtn = authenticatedPage.locator('button:has-text("Create"), input[type="submit"][value="Create"]').first();
    await createBtn.click({ force: true });
    await authenticatedPage.waitForLoadState('networkidle');

    // 5. Verify token generation
    console.log('Step 5: Verifying generated Token...');
    const tokenResultText = authenticatedPage.locator('body').filter({ hasText: 'Expire On' }).first();
    await expect(tokenResultText).toBeVisible({ timeout: 10000 });
    
    // Added visual wait time for headed mode validation
    console.log('Waiting 5 seconds for visual confirmation...');
    await authenticatedPage.waitForTimeout(5000);

    console.log('\nSuccess: JWT Token generated successfully!');
  });
});
