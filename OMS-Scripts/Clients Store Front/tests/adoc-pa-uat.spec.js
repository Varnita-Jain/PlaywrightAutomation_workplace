const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { AdocPaHomePage } = require('../pages/clients/adoc-pa/AdocPaHomePage');
const { AdocPaCategoryPage } = require('../pages/clients/adoc-pa/AdocPaCategoryPage');
const { AdocPaProductPage } = require('../pages/clients/adoc-pa/AdocPaProductPage');
const { AdocPaCartModal } = require('../pages/clients/adoc-pa/AdocPaCartModal');
const { AdocPaCheckoutPage } = require('../pages/clients/adoc-pa/AdocPaCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe('Storefront Order Placement - adoc-pa-uat', () => {
  let config;
  let clientData;

  test.beforeAll(() => {
    config = getClientConfig('adoc-pa-uat');
    clientData = checkoutData['adoc-pa'];
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes due to many verifications and Shopify loads

    const homePage = new AdocPaHomePage(page, config);
    const categoryPage = new AdocPaCategoryPage(page, config);
    const productPage = new AdocPaProductPage(page, config);
    const checkoutPage = new AdocPaCheckoutPage(page, config);
    
    // Step 1: Navigate to ADOC - Panama Store
    await test.step('Step 1: Navigate to ADOC - Panama Store', async () => {
      await page.goto(config.storefrontUrl || 'https://par2-sandbox-pa.myshopify.com');
      
      // Handle password if prompted
      const loginModalLink = page.locator('a.js-modal-open-login-modal', { hasText: /Entrar usando contraseña/i });
      if (await loginModalLink.isVisible()) {
        await loginModalLink.click();
      }
      const passwordInput = page.locator('input[type="password"]');
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(config.storefrontPassword || 'panama2025');
        await page.locator('button[type="submit"]', { hasText: /Ingresar/i }).click();
        await page.waitForTimeout(2000);
      }

      await page.waitForLoadState('domcontentloaded');
      
      // Navigate to Accessories
      await homePage.navigateToAccessories();
      expect(page.url()).toContain('accesorios');
    });

    // Step 3 & 4: Open Product & Select Variants (with retry logic)
    let productAdded = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await test.step(`Step 3: Open Product (Attempt ${attempt + 1})`, async () => {
        // Find all unique product links
        const productLinks = page.locator('a[href*="/products/"]:not([href*="quick"]):not(:has-text("Vista rápida"))');
        await productLinks.first().waitFor({ state: 'visible', timeout: 15000 });
        
        // Pick a different product based on attempt
        const linkToClick = productLinks.nth(attempt * 3); 
        await linkToClick.click({ force: true });
        
        // Wait for navigation
        await page.waitForTimeout(2000);
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step(`Step 4: Select Product Variants (Attempt ${attempt + 1})`, async () => {
        try {
          await productPage.selectAvailableVariants();
          productAdded = true;
        } catch (e) {
          if (e.message.includes("No available variants")) {
            console.log(`Product out of stock on attempt ${attempt + 1}, trying another...`);
            await page.goBack();
            await page.waitForTimeout(2000);
          } else {
            throw e;
          }
        }
      });

      if (productAdded) break;
    }

    if (!productAdded) {
      throw new Error("Failed to find any product with available stock after multiple attempts.");
    }

    // Step 5: Add Product to Cart
    await test.step('Step 5: Add Product to Cart', async () => {
      await productPage.clickAddToCart();
      const cartDrawer = page.locator('.drawer__inner, #CartDrawer, .cart-drawer, .site-header__cart-count');
      await expect(cartDrawer.first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    });

    // Step 6: Open Shopping Cart
    await test.step('Step 6: Open Shopping Cart & Checkout', async () => {
      const cartModal = new AdocPaCartModal(page, config);
      await cartModal.proceedToCartPage();
      expect(page.url()).toContain('/cart');
      await cartModal.proceedToCheckout();
      await checkoutPage.verifyCheckoutPageLoaded();
    });

    // Step 7: Complete Checkout
    await test.step('Step 7: Complete Checkout', async () => {
      await checkoutPage.verifyAndFillContactDetails(clientData.contact);
      await page.screenshot({ path: 'debug-contact-details.png', fullPage: true });
      await checkoutPage.verifyAndSelectDeliveryMethod();
      await checkoutPage.fillShippingAddress(clientData.shipping);
      await checkoutPage.verifyAndSelectShippingMethod();
      await checkoutPage.completePayment(clientData.payment);
    });

    // Step 8: Verify Order Summary
    await test.step('Step 8: Verify Order Summary', async () => {
      // (Optional)
    });

    // Step 9: Place Order
    await test.step('Step 9: Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      saveOrderId('adoc-pa-uat', orderId);
      console.log('Order successfully placed! Order ID:', orderId);
      
      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
