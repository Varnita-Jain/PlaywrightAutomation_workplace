const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { ThirdLoveHomePage } = require('../pages/clients/thirdlove/ThirdLoveHomePage');
const { ThirdLoveCategoryPage } = require('../pages/clients/thirdlove/ThirdLoveCategoryPage');
const { ThirdLoveProductPage } = require('../pages/clients/thirdlove/ThirdLoveProductPage');
const { ThirdLoveCheckoutPage } = require('../pages/clients/thirdlove/ThirdLoveCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe('Storefront Order Placement - thirdlove-uat', () => {
  let config;
  let clientData;

  test.beforeAll(() => {
    // Retrieve configuration specifically for thirdlove-uat
    config = getClientConfig('thirdlove-uat');
    clientData = checkoutData['thirdlove'];
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    // Initialize Page Objects
    const homePage = new ThirdLoveHomePage(page, config);
    const categoryPage = new ThirdLoveCategoryPage(page, config);
    const productPage = new ThirdLoveProductPage(page, config);
    const checkoutPage = new ThirdLoveCheckoutPage(page, config);
    
    // 1. Verify Homepage and Navigate to Category
    await test.step('Verify Homepage and Navigate to Category', async () => {
      await homePage.verifyHomepageLoaded();
      await homePage.navigateToCategory('all');
    });

    // 2. Open First Product
    await test.step('Navigate to First Product', async () => {
      await categoryPage.clickFirstProduct();
    });

    // 3. Add to Bag and Checkout
    await test.step('Add Product to Cart and Proceed to Checkout', async () => {
      await productPage.selectSize();
      await productPage.addToBag();
      await productPage.proceedToCheckout();
    });

    // 4. Verify Checkout Page
    await test.step('Verify Checkout Page Sections', async () => {
      await checkoutPage.verifyCheckoutPage();
      await checkoutPage.verifyExpressCheckout();
    });

    // 5. Fill Contact Information
    await test.step('Fill Contact Information', async () => {
      await checkoutPage.fillContactDetails(clientData.contact);
    });

    // 6. Fill Shipping Information
    await test.step('Fill Shipping Information', async () => {
      await checkoutPage.fillDeliveryAddress(clientData.shipping);
      await checkoutPage.verifyShippingMethod();
    });

    // 7. Complete Payment and Validations
    await test.step('Complete Payment and Validate', async () => {
      await checkoutPage.completePayment(clientData.payment);
      await checkoutPage.verifyBillingAddress();
      await checkoutPage.verifySaveInformation();
      await checkoutPage.verifyOrderSummary();
    });

    // 8. Place Order
    await test.step('Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      saveOrderId('thirdlove-uat', orderId);
      
      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
