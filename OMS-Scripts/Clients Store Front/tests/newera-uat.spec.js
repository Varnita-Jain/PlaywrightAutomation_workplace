const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { NewEraHomePage } = require('../pages/clients/newera/NewEraHomePage');
const { NewEraCategoryPage } = require('../pages/clients/newera/NewEraCategoryPage');
const { NewEraCartModal } = require('../pages/clients/newera/NewEraCartModal');
const { NewEraCheckoutPage } = require('../pages/clients/newera/NewEraCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe(`Storefront Order Placement - ${process.env.CLIENT}`, () => {
  let config;
  
  test.beforeAll(() => {
    config = getClientConfig(process.env.CLIENT);
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    const homePage = new NewEraHomePage(page, config);
    const categoryPage = new NewEraCategoryPage(page, config);
    const cartModal = new NewEraCartModal(page, config);
    const checkoutPage = new NewEraCheckoutPage(page, config);

    // 1. Navigate to Storefront
    await test.step('Navigate to Storefront', async () => {
      await page.goto(config.shopify.storefrontUrl, { waitUntil: 'domcontentloaded' });
    });

    // 2. Open Headwear Category
    await test.step('Open Headwear Category', async () => {
      await homePage.openHeadwearCategory();
    });

    // 3. Select First Available Product
    await test.step('Open First Available Product', async () => {
      await categoryPage.openFirstAvailableProduct();
    });

    // 4. Select Product Size
    await test.step('Select Product Size', async () => {
      await categoryPage.selectProductSize();
    });

    // 5. Add Product to Bag
    await test.step('Add Product to Bag', async () => {
      await categoryPage.addProductToBag();
    });

    // 6. Continue as Guest
    await test.step('Continue as Guest', async () => {
      await cartModal.continueAsGuest();
    });

    // 7. Proceed to Checkout
    await test.step('Proceed to Checkout', async () => {
      await cartModal.proceedToCheckout();
    });

    // 5. Checkout - Verify Page
    await test.step('Verify Checkout Page', async () => {
      await checkoutPage.verifyCheckoutPageLoaded();
    });

    // 6. Checkout - Fill Contact
    await test.step('Fill Contact Details', async () => {
      await checkoutPage.fillContactDetails();
    });

    // 7. Checkout - Fill Delivery Address
    await test.step('Fill Delivery Address', async () => {
      await checkoutPage.fillDeliveryAddress();
    });

    // 8. Checkout - Select Shipping Method
    await test.step('Select Shipping Method', async () => {
      await checkoutPage.selectShippingMethod();
    });

    // 9. Checkout - Complete Payment
    await test.step('Complete Payment', async () => {
      await checkoutPage.completePayment();
    });

    // 10. Checkout - Place Order
    await test.step('Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      saveOrderId('newera-uat', orderId);
      
      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
