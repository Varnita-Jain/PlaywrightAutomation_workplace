const { test, expect } = require('@playwright/test');
const { getClientConfig } = require('../../config/clients');
const { MephistoHomePage } = require('../pages/clients/mephisto/MephistoHomePage');
const { MephistoCategoryPage } = require('../pages/clients/mephisto/MephistoCategoryPage');
const { MephistoCartModal } = require('../pages/clients/mephisto/MephistoCartModal');
const { MephistoCheckoutPage } = require('../pages/clients/mephisto/MephistoCheckoutPage');
const { saveOrderId } = require('../utils/orderStore');
const checkoutData = require('../data/checkoutData.json');

test.describe('Storefront Order Placement - mephisto-uat', () => {
  let config;
  let clientData;

  test.beforeAll(() => {
    config = getClientConfig('mephisto-uat');
    clientData = checkoutData['mephisto'];
  });

  test('should successfully navigate checkout flow', async ({ page }) => {
    const homePage = new MephistoHomePage(page, config);
    const categoryPage = new MephistoCategoryPage(page, config);
    const cartModal = new MephistoCartModal(page, config);
    const checkoutPage = new MephistoCheckoutPage(page, config);
    
    // IMPORTANT: Check for Storefront URL fallback if it isn't set in config
    const storefrontUrl = config.shopify?.storefrontUrl || 'https://mephistousa.myshopify.com';

    await test.step('Navigate to Homepage', async () => {
      await page.goto(storefrontUrl);
      
      // Handle the Mephisto specific password page
      if (await page.locator('.password-enter__button').isVisible().catch(() => false)) {
        await page.locator('.password-enter__button').click();
        await page.getByLabel('Enter password').fill(config.shopify?.storefrontPassword || 'reoldi');
        await page.locator('.password-dialog__submit-button').click();
        await page.waitForLoadState('domcontentloaded');
      }
    });

    await test.step('Navigate to Primary Category', async () => {
      await homePage.openPrimaryCategory();
    });

    await test.step('Open First Available Product', async () => {
      await categoryPage.openFirstAvailableProduct();
    });

    await test.step('Select Size', async () => {
      await categoryPage.selectProductSize();
    });

    await test.step('Add Product to Bag', async () => {
      await categoryPage.addProductToBag();
    });

    await test.step('Proceed to Checkout', async () => {
      await cartModal.proceedToCheckout();
    });

    await test.step('Verify Checkout Page', async () => {
      await checkoutPage.verifyCheckoutPage();
    });

    await test.step('Fill Contact Information', async () => {
      await checkoutPage.fillContactDetails(clientData.contact);
    });

    await test.step('Fill Shipping Information', async () => {
      await checkoutPage.fillDeliveryAddress(clientData.shipping);
    });

    await test.step('Select Shipping Method', async () => {
      await checkoutPage.selectShippingMethod();
    });

    await test.step('Complete Payment', async () => {
      await checkoutPage.completePayment(clientData.payment);
    });

    await test.step('Place Order', async () => {
      const orderId = await checkoutPage.placeOrder();
      
      saveOrderId('mephisto-uat', orderId);
      
      // Add wait time for 2 mins
      console.log('Waiting for 2 minutes as requested...');
      await page.waitForTimeout(120000);
    });
  });
});
