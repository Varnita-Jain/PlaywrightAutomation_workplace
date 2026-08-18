const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { StorefrontPasswordPage } = require('../pages/shared/StorefrontPasswordPage');
const { AdocCrHomePage } = require('../pages/clients/adoc-cr/AdocCrHomePage');
const { AdocCrCategoryPage } = require('../pages/clients/adoc-cr/AdocCrCategoryPage');
const { AdocCrCartModal } = require('../pages/clients/adoc-cr/AdocCrCartModal');
const { AdocCrCheckoutPage } = require('../pages/clients/adoc-cr/AdocCrCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe('Storefront Order Placement - adoc-cr-uat', () => {
  let config;
  let clientData;

  test.beforeAll(() => {
    // Retrieve configuration specifically for adoc-cr-uat
    config = getClientConfig('adoc-cr-uat');
    clientData = checkoutData['adoc-cr'];
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    // Initialize Page Objects
    const passwordPage = new StorefrontPasswordPage(page, config);
    const homePage = new AdocCrHomePage(page, config);
    const categoryPage = new AdocCrCategoryPage(page, config);
    const cartModal = new AdocCrCartModal(page, config);
    const checkoutPage = new AdocCrCheckoutPage(page, config);
    
    // 1. Unlock Storefront
    await test.step('Unlock Storefront', async () => {
      await passwordPage.unlockStorefront('The North Face - Costa Rica - Sandbox');
      expect(page.url()).not.toContain('/password');
    });

    // 2. Verify Homepage and Navigate to Category
    await test.step('Verify Homepage and Navigate to Category', async () => {
      await homePage.verifyHomepageLoaded('The North Face');
      await homePage.navigateToCategory('Womens');
    });

    // 3. Quick Add First Product
    await test.step('Quick Add Product', async () => {
      await categoryPage.quickAddFirstProduct();
    });

    // 4. Add to Cart from Quick View and Proceed to Checkout
    await test.step('Add to Cart and Proceed to Checkout', async () => {
      await cartModal.addToCartFromQuickView();
      await cartModal.proceedToCheckout();
    });

    // 5. Verify Checkout Page loaded successfully
    await test.step('Verify Checkout Page', async () => {
      await checkoutPage.verifyCheckoutPage('Contacto');
    });

    // 6. Fill Contact Information
    await test.step('Fill Contact Information', async () => {
      await checkoutPage.fillContactDetails(clientData.contact);
    });

    // 7. Fill Shipping Information
    await test.step('Fill Shipping Information', async () => {
      await checkoutPage.fillShippingAddress(clientData.shipping);
    });

    // 8. Complete Payment
    await test.step('Complete Payment', async () => {
      await checkoutPage.completePayment(clientData.payment);
    });

    // 9. Place Order
    await test.step('Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      
      saveOrderId('adoc-cr-uat', orderId);

      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
