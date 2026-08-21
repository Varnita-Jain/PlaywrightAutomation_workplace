const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const fs = require('fs');
const path = require('path');

test.describe(`Unified Storefront E2E Checkout`, () => {
  let config;
  let locators;
  let clientLocators;

  test.beforeAll(() => {
    // Determine client from environment
    const clientId = process.env.CLIENT;
    if (!clientId) throw new Error("CLIENT environment variable must be set");
    config = getClientConfig(clientId);
    
    // Load Locators
    const locatorPath = path.resolve(__dirname, '../../config/storefront-locators.json');
    locators = JSON.parse(fs.readFileSync(locatorPath, 'utf8'));
    clientLocators = { ...locators.default, ...(locators[clientId] || {}) };
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    test.setTimeout(180000); // 3 mins max

    const storefrontUrl = config.shopify?.storefrontUrl || config.storefrontUrl;
    const storefrontPassword = config.shopify?.storefrontPassword || config.storefrontPassword;

    // 1. Navigate to Storefront Homepage
    await test.step('Navigate to Homepage', async () => {
      await page.goto(storefrontUrl, { waitUntil: 'domcontentloaded' });
      
      // Handle password wall if present
      const passModal = page.locator(clientLocators.passwordModalOpen).first();
      if (await passModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await passModal.click();
        await page.locator(clientLocators.passwordInput).first().fill(storefrontPassword || '');
        await page.locator(clientLocators.passwordSubmit).first().click();
        await page.waitForLoadState('domcontentloaded');
      }
    });

    // 2. Open Primary Category
    await test.step('Open Primary Category', async () => {
      const categoryLink = page.locator(clientLocators.categoryLink).first();
      await categoryLink.waitFor({ state: 'attached' });
      const href = await categoryLink.getAttribute('href');
      if (href && href.startsWith('/')) {
        await page.goto(new URL(href, page.url()).href);
      } else {
        await categoryLink.click({ force: true });
      }
      await page.waitForLoadState('domcontentloaded');
    });

    // 3. Open First Product
    await test.step('Open First Available Product', async () => {
      const productLink = page.locator(clientLocators.productLink).first();
      await productLink.waitFor({ state: 'attached', timeout: 15000 });
      const href = await productLink.getAttribute('href');
      if (href && href.startsWith('/')) {
        await page.goto(new URL(href, page.url()).href);
      } else {
        await productLink.click({ force: true });
      }
      await page.waitForLoadState('domcontentloaded');
    });

    // 4. Select Size & Add to Cart
    await test.step('Add Product to Bag', async () => {
      // Find size selector if it exists
      const sizeElements = page.locator(clientLocators.sizeSelector, { hasText: /^(8|9|10|11|M|L)$/i });
      if (await sizeElements.count() > 0) {
        await sizeElements.first().click({ force: true }).catch(() => {});
      }

      const addToBagBtn = page.locator(clientLocators.addToCartBtn).first();
      await addToBagBtn.waitFor({ state: 'visible' });
      await addToBagBtn.click();
      await page.waitForTimeout(3000); // Wait for cart API
    });

    // 5. Open Cart & Proceed to Checkout
    await test.step('Proceed to Checkout', async () => {
      const checkoutBtn = page.locator(clientLocators.checkoutBtn).first();
      
      // If we are still on the product page and checkout is not visible, maybe there's a cart modal
      if (!await checkoutBtn.isVisible().catch(() => false)) {
        await page.goto(new URL('/cart', page.url()).href);
      }
      
      await checkoutBtn.waitFor({ state: 'visible' });
      await checkoutBtn.click();
      await page.waitForLoadState('domcontentloaded');
    });

    // 6. Fill Checkout details
    await test.step('Complete Checkout Form', async () => {
      // This is a placeholder for the massive Shopify checkout form.
      // Shopify has drastically different checkout flows depending on Express checkout, new vs old checkout.
      // We are just validating that the test reached the checkout page organically.
      expect(page.url()).toContain('checkout');
      console.log('Successfully reached Shopify Checkout dynamically!');
    });
  });
});
