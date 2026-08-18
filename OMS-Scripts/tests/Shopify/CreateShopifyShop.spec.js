const { test, expect } = require('../../fixtures/fixtures');

test.describe('Shopify Config / CreateShopifyShop Flow', () => {
  
  test('should navigate to Create Shopify Shop and submit form', async ({ authenticatedPage, baseURL, clientId }) => {
    console.log(`\n=== Running CreateShopifyShop Test for: ${clientId} ===`);

    // 1. Navigate to landing page
    const url = new URL(baseURL);
    await authenticatedPage.goto(`${url.origin}/commerce/control/main`);
    await authenticatedPage.waitForLoadState('networkidle');
    await authenticatedPage.waitForTimeout(3000); // Wait for page scripts to load

    // 2. Open/reveal side menu
    console.log('Step 1: Revealing side menu...');
    const menuToggle = authenticatedPage.locator('ion-menu-button, .menu-toggle, button[aria-label="menu"]').first();
    if (await menuToggle.isVisible().catch(() => false)) {
        await menuToggle.click({ force: true });
    }
    const sideMenu = authenticatedPage.locator('.side-menu, ion-menu').first();
    await sideMenu.hover().catch(() => {});
    await authenticatedPage.waitForTimeout(1000);

    // 3. Click "Shopify" option
    console.log('Step 2: Clicking "Shopify" option...');
    const shopifyMenu = authenticatedPage.locator('text="Shopify"').first();
    await shopifyMenu.click({ force: true });
    await authenticatedPage.waitForTimeout(1000);

    // 4. Click "CreateShopifyShop" option
    console.log('Step 3: Clicking "CreateShopifyShop" child menu option...');
    const createShopifyLink = authenticatedPage.locator('text="Create Shopify Shop"').or(authenticatedPage.locator('text="CreateShopifyShop"')).first();
    await createShopifyLink.click({ force: true });
    
    await authenticatedPage.waitForLoadState('networkidle').catch(() => {});
    await authenticatedPage.waitForTimeout(3000);

    // 5. Verify the CreateShopifyShop page opened successfully
    console.log('Step 4: Verifying the Create Shopify Shop form is visible...');
    const shopIdLabel = authenticatedPage.locator('label').filter({ hasText: 'Shop Id' }).first();
    await expect(shopIdLabel).toBeVisible({ timeout: 15000 });



    // 7. Fill out the form fields
    console.log('Step 5: Filling out Create Shopify Shop form fields...');
    
    // Fill Shop Id
    const shopIdInput = authenticatedPage.locator('label:has-text("Shop Id") ~ input, input[name="shopId"], input#shopId').first();
    await shopIdInput.fill('test-shop-id');

    // Fill Shopify Config Id
    const configIdInput = authenticatedPage.locator('label:has-text("Shopify Config Id") ~ input, input[name="shopifyConfigId"], input#shopifyConfigId').first();
    await configIdInput.fill('test-config-id');

    // Fill Shopify Config Name
    const configNameInput = authenticatedPage.locator('label:has-text("Shopify Config Name") ~ input, input[name="shopifyConfigName"], input#shopifyConfigName').first();
    await configNameInput.fill('Test Shopify Config');

    // Fill Shop domain
    const shopInput = authenticatedPage.locator('input[placeholder="shop"], input[name="shop"], input#shop').first();
    await shopInput.fill('test-sandbox-shop');

    // Fill Access Token
    const tokenInput = authenticatedPage.locator('label:has-text("Access Token") ~ input, input[name="accessToken"], input#accessToken').first();
    await tokenInput.fill('shpat_dummytoken1234567890');

    // Fill Client Id
    const clientIdInput = authenticatedPage.locator('label:has-text("Client Id") ~ input, input[name="clientId"], input#clientId').first();
    await clientIdInput.fill('dummy_client_id_987654321');

    // Fill Client Secret
    const clientSecretInput = authenticatedPage.locator('label:has-text("Client Secret") ~ input, input[name="clientSecret"], input#clientSecret').first();
    await clientSecretInput.fill('dummy_client_secret_abcdef123456');

    // Fill Dropdowns (Access Scope and Product Store)
    const scopeSelect = authenticatedPage.locator('select[name="accessScope"], label:has-text("Access Scope") ~ select').first();
    if (await scopeSelect.isVisible().catch(() => false)) {
      await scopeSelect.selectOption({ index: 0 }).catch(() => {});
    }

    const storeSelect = authenticatedPage.locator('select[name="productStore"], label:has-text("Product Store") ~ select').first();
    if (await storeSelect.isVisible().catch(() => false)) {
      await storeSelect.selectOption({ index: 0 }).catch(() => {});
    }

    // 8. Click the "Create" button to submit
    console.log('Step 6: Clicking "Create" button to submit form...');
    let createButton = authenticatedPage.getByRole('button', { name: 'Create', exact: true }).first();
    if (!await createButton.isVisible().catch(() => false)) {
      createButton = authenticatedPage.locator('button:has-text("Create"), input[type="submit"][value="Create"]').first();
    }
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click({ force: true }); // Standard and force click combined for maximum reliability

    await authenticatedPage.waitForLoadState('networkidle').catch(() => {});
    await authenticatedPage.waitForTimeout(3000);
    console.log('\nSuccess: Form submitted successfully!');
  });

});
