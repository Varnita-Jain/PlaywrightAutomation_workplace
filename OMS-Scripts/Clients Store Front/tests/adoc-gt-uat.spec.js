const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { AdocGtHomePage } = require('../pages/clients/adoc-gt/AdocGtHomePage');
const { AdocGtCategoryPage } = require('../pages/clients/adoc-gt/AdocGtCategoryPage');
const { AdocGtProductPage } = require('../pages/clients/adoc-gt/AdocGtProductPage');
const { AdocGtCartModal } = require('../pages/clients/adoc-gt/AdocGtCartModal');
const { AdocGtCheckoutPage } = require('../pages/clients/adoc-gt/AdocGtCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe('Storefront Order Placement - adoc-gt-uat', () => {
  let config;
  let clientData;

  test.beforeAll(() => {
    config = getClientConfig('adoc-gt-uat');
    clientData = checkoutData['adoc-gt'];
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    const homePage = new AdocGtHomePage(page, config);
    const categoryPage = new AdocGtCategoryPage(page, config);
    const productPage = new AdocGtProductPage(page, config);
    const cartModal = new AdocGtCartModal(page, config);
    const checkoutPage = new AdocGtCheckoutPage(page, config);
    
    // Step 1: Open Password Protected Store
    await test.step('Step 1: Open Password Protected Store', async () => {
      await page.goto(config.storefrontUrl || 'https://sandbox-guatemala.myshopify.com');
      
      const loginModalLink = page.locator('a[href="#password-login"]').or(page.locator('a[href="#LoginModal"]')).or(page.locator('text="Ingresar utilizando contraseña"')).first();
      if (await loginModalLink.count() > 0) {
        await loginModalLink.click({ force: true });
        await page.waitForTimeout(1000); // Wait for modal to animate open
      }

      const passwordInput = page.locator('input[type="password"]');
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await passwordInput.fill(config.storefrontPassword || "Fu3$}'Yhke9H+^'");
        await passwordInput.press('Enter');
        await page.waitForLoadState('networkidle');
      }

      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('sandbox');
    });

    // Step 2: Navigate to Men's Collection
    await test.step('Step 2: Navigate to Mens Collection', async () => {
      await homePage.navigateToMens();
      expect(page.url()).toContain('hombres');
    });

    // Step 3 & 4: Open Product & Select Variants (with retry logic)
    let productAdded = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await test.step(`Step 3: Open Product (Attempt ${attempt + 1})`, async () => {
        // Find all unique product links
        const productLinks = page.locator('a[href*="/products/"]:not([href*="quick"]):not(:has-text("Vista rápida"))');
        await productLinks.first().waitFor({ state: 'visible', timeout: 15000 });
        
        // Pick a different product based on attempt (multiplied by 3 to skip image/title duplicate links)
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
            await page.waitForLoadState('networkidle');
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
      const cartDrawer = cartModal.getCartConfirmationModal();
      await expect(cartDrawer).toBeVisible({ timeout: 15000 });
    });

    // Step 6: Open Shopping Cart
    await test.step('Step 6: Open Shopping Cart & Checkout', async () => {
      await cartModal.proceedToCartPage();
      expect(page.url()).toContain('/cart');
      await cartModal.proceedToCheckout();
      await checkoutPage.verifyCheckoutPageLoaded();
    });

    // Step 7: Complete Checkout
    await test.step('Step 7: Complete Checkout', async () => {
      await checkoutPage.verifyAndFillContactDetails(clientData.contact);
      await checkoutPage.verifyAndSelectDeliveryMethod();
      await checkoutPage.fillShippingAddress(clientData.shipping);
      await checkoutPage.verifyAndSelectShippingMethod();
      await checkoutPage.completePayment(clientData.payment);
    });

    // Step 8: Verify Order Summary
    await test.step('Step 8: Verify Order Summary', async () => {
      await checkoutPage.verifyOrderSummary();
    });

    // Step 9: Place Order
    await test.step('Step 9: Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      saveOrderId('adoc-gt-uat', orderId);
      console.log('Order successfully placed! Order ID:', orderId);
      
      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
